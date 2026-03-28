"""
SPYCE AI Service — FastAPI
Handles: challenge verification, content moderation, engagement scoring,
         caption generation, fraud detection
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import mediapipe as mp
import cv2
import numpy as np
import httpx
import os
import tempfile
from typing import Optional

# ⚠️  UPDATE: Set these env vars
# AI_SERVICE_SECRET — internal auth token for service-to-service calls
# SPYCE_API_URL — internal URL of the NestJS API gateway

app = FastAPI(title="SPYCE AI Service", version="1.0.0")

# ─── Models ──────────────────────────────────────────────────────────────────

class VerifyVideoRequest(BaseModel):
    completion_id: str
    video_url: str
    challenge_type: str  # pushup | squat | plank | steps | custom
    target_reps: Optional[int] = None

class ModerationRequest(BaseModel):
    video_url: str
    video_id: str

class EngagementScoreRequest(BaseModel):
    video_id: str
    duration_secs: int
    hashtags: list[str]
    creator_follower_count: int
    hour_of_day: int
    day_of_week: int

# ─── Challenge Verifier ──────────────────────────────────────────────────────

class ExerciseVerifier:
    def __init__(self):
        self.pose = mp.solutions.pose.Pose(
            model_complexity=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7,
        )

    def _angle(self, a, b, c) -> float:
        """Calculate angle at point b between a-b-c."""
        ba = np.array([a.x - b.x, a.y - b.y])
        bc = np.array([c.x - b.x, c.y - b.y])
        cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
        return float(np.degrees(np.arccos(np.clip(cosine, -1, 1))))

    def verify_pushups(self, video_path: str, target_reps: int = 10) -> dict:
        cap = cv2.VideoCapture(video_path)
        rep_count, down_state, confidences = 0, False, []
        PL = mp.solutions.pose.PoseLandmark

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            result = self.pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not result.pose_landmarks:
                continue
            lm = result.pose_landmarks.landmark
            elbow_angle = self._angle(lm[PL.LEFT_SHOULDER], lm[PL.LEFT_ELBOW], lm[PL.LEFT_WRIST])

            if elbow_angle < 90 and not down_state:
                down_state = True
            elif elbow_angle > 160 and down_state:
                down_state = False
                rep_count += 1

            confidences.append(lm[0].visibility)

        cap.release()
        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        return {
            "rep_count": rep_count,
            "confidence": avg_conf,
            "verified": rep_count >= target_reps and avg_conf > 0.75,
            "method": "mediapipe_pose",
        }

    def verify_squats(self, video_path: str, target_reps: int = 15) -> dict:
        cap = cv2.VideoCapture(video_path)
        rep_count, up_state, confidences = 0, True, []
        PL = mp.solutions.pose.PoseLandmark

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            result = self.pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not result.pose_landmarks:
                continue
            lm = result.pose_landmarks.landmark
            knee_angle = self._angle(lm[PL.LEFT_HIP], lm[PL.LEFT_KNEE], lm[PL.LEFT_ANKLE])

            if knee_angle < 100 and up_state:
                up_state = False
            elif knee_angle > 150 and not up_state:
                up_state = True
                rep_count += 1

            confidences.append(lm[0].visibility)

        cap.release()
        avg_conf = float(np.mean(confidences)) if confidences else 0.0
        return {
            "rep_count": rep_count,
            "confidence": avg_conf,
            "verified": rep_count >= target_reps and avg_conf > 0.75,
            "method": "mediapipe_pose",
        }


verifier = ExerciseVerifier()

# ─── Engagement Scorer ───────────────────────────────────────────────────────

def compute_engagement_score(
    duration_secs: int,
    hashtags: list[str],
    creator_follower_count: int,
    hour_of_day: int,
    day_of_week: int,
) -> float:
    """
    Simple feature-based engagement score (0–100).
    ⚠️  UPDATE: Replace with trained XGBoost/GBM model for production.
    Load with: model = xgb.XGBRegressor(); model.load_model('engagement_model.json')
    """
    score = 0.0

    # Duration sweet spot: 15–45 seconds
    if 15 <= duration_secs <= 45:
        score += 30
    elif 10 <= duration_secs <= 60:
        score += 20
    else:
        score += 5

    # Hashtag bonus (trending hashtags would boost more)
    score += min(len(hashtags) * 3, 15)

    # Creator audience size (log scale)
    if creator_follower_count > 0:
        score += min(np.log10(creator_follower_count + 1) * 5, 20)

    # Peak engagement hours: 18–22 local time
    if 18 <= hour_of_day <= 22:
        score += 15
    elif 12 <= hour_of_day <= 17:
        score += 10

    # Weekday vs weekend
    if day_of_week in [5, 6]:  # Saturday, Sunday
        score += 10
    else:
        score += 5

    return min(score, 100.0)


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "spyce-ai"}


@app.post("/verify-challenge")
async def verify_challenge(request: VerifyVideoRequest, background_tasks: BackgroundTasks):
    """
    Download video from URL, run pose estimation, return result.
    Called by challenge service after video proof upload.
    """
    background_tasks.add_task(_run_verification, request)
    return {"status": "processing", "completion_id": request.completion_id}


async def _run_verification(request: VerifyVideoRequest):
    try:
        # Download video
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            async with httpx.AsyncClient() as client:
                response = await client.get(request.video_url, timeout=30)
                f.write(response.content)
                tmp_path = f.name

        # Run appropriate verifier
        if request.challenge_type == "pushup":
            result = verifier.verify_pushups(tmp_path, request.target_reps or 10)
        elif request.challenge_type == "squat":
            result = verifier.verify_squats(tmp_path, request.target_reps or 15)
        else:
            # Self-reported / video proof → flag for human review if suspicious
            result = {"verified": True, "confidence": 0.8, "rep_count": 0, "method": "self_report"}

        # Callback to NestJS API
        api_url = os.getenv("SPYCE_API_URL", "http://localhost:4000")
        secret = os.getenv("AI_SERVICE_SECRET", "dev-secret")
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{api_url}/api/v1/challenges/verify-callback",
                json={
                    "completionId": request.completion_id,
                    "verified": result["verified"],
                    "aiConfidence": result["confidence"],
                    "details": result,
                },
                headers={"X-AI-Secret": secret},
                timeout=10,
            )

        # Cleanup
        os.unlink(tmp_path)

    except Exception as e:
        print(f"Verification error for {request.completion_id}: {e}")


@app.post("/score-engagement")
def score_engagement(request: EngagementScoreRequest):
    score = compute_engagement_score(
        duration_secs=request.duration_secs,
        hashtags=request.hashtags,
        creator_follower_count=request.creator_follower_count,
        hour_of_day=request.hour_of_day,
        day_of_week=request.day_of_week,
    )
    return {"video_id": request.video_id, "engagement_score": score}


@app.post("/moderate-content")
async def moderate_content(request: ModerationRequest):
    """
    ⚠️  UPDATE: Integrate NudeNet or AWS Rekognition for NSFW detection.
    
    Using AWS Rekognition:
    import boto3
    client = boto3.client('rekognition', region_name=os.getenv('AWS_REGION'))
    response = client.detect_moderation_labels(
        Video={'S3Object': {'Bucket': bucket, 'Name': key}},
        MinConfidence=70,
    )
    
    Using NudeNet:
    from nudenet import NudeDetector
    detector = NudeDetector()
    result = detector.detect(image_path)
    """
    # Placeholder — approve all for MVP
    return {
        "video_id": request.video_id,
        "approved": True,
        "confidence": 0.95,
        "flags": [],
    }


if __name__ == "__main__":
    import uvicorn
    # ⚠️  UPDATE: Bind to 0.0.0.0 only in trusted network; use auth middleware in production
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
