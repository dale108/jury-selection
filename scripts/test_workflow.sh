#!/bin/bash
# Sample curl commands to test the voir-dire system
# Run this after: docker compose up -d

BASE_URL="http://localhost:8000/api"

echo "🚀 Voir-Dire API Test Workflow"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Create a Session${NC}"
echo "curl -X POST $BASE_URL/sessions/ \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"case_number\": \"2024-TEST-001\", \"case_name\": \"State v. Test Defendant\", \"court\": \"King County Superior Court\"}'"
echo ""

SESSION_RESPONSE=$(curl -s -X POST $BASE_URL/sessions/ \
  -H "Content-Type: application/json" \
  -d '{"case_number": "2024-TEST-001", "case_name": "State v. Test Defendant", "court": "King County Superior Court", "metadata": {"judge": "Hon. Test Judge", "courtroom": "E-501"}}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to create session"
    echo "Response: $SESSION_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Session created: $SESSION_ID${NC}"
echo "Response: $SESSION_RESPONSE"
echo ""

echo -e "${BLUE}Step 2: Update Session Status to Active${NC}"
echo "curl -X PATCH $BASE_URL/sessions/$SESSION_ID/status \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"status\": \"active\"}'"
echo ""

curl -s -X PATCH $BASE_URL/sessions/$SESSION_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}' | jq '.'
echo ""

echo -e "${BLUE}Step 3: Create Jurors${NC}"
echo ""

# Create Juror 1
echo -e "${YELLOW}Creating Juror 1...${NC}"
JUROR1_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 1, \"first_name\": \"Jane\", \"last_name\": \"Smith\", \"occupation\": \"Software Engineer\", \"neighborhood\": \"Capitol Hill\", \"demographics\": {\"age_range\": \"30-40\"}, \"notes\": \"Works from home\"}")

JUROR1_ID=$(echo $JUROR1_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 1 created: $JUROR1_ID${NC}"

# Create Juror 2
echo -e "${YELLOW}Creating Juror 2...${NC}"
JUROR2_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 2, \"first_name\": \"John\", \"last_name\": \"Doe\", \"occupation\": \"Teacher\", \"neighborhood\": \"Ballard\", \"demographics\": {\"age_range\": \"40-50\"}, \"notes\": \"Middle school science teacher\"}")

JUROR2_ID=$(echo $JUROR2_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 2 created: $JUROR2_ID${NC}"
echo ""

echo -e "${BLUE}Step 4: Load Sample Transcript${NC}"
echo "curl -X POST $BASE_URL/transcripts/load-sample/$SESSION_ID"
echo ""

LOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/transcripts/load-sample/$SESSION_ID")
if echo "$LOAD_RESPONSE" | grep -q "segments_loaded"; then
    echo -e "${GREEN}✓ Transcript loaded${NC}"
    echo "$LOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$LOAD_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Could not load transcript${NC}"
    echo "$LOAD_RESPONSE"
fi
echo ""

echo -e "${BLUE}Step 5: Map Speakers to Jurors${NC}"
echo ""

# Map SPEAKER_A to Juror 1
echo -e "${YELLOW}Mapping SPEAKER_A to Juror 1...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR1_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_A"}' | jq '.'
echo ""

# Map SPEAKER_B to Juror 2
echo -e "${YELLOW}Mapping SPEAKER_B to Juror 2...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR2_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_B"}' | jq '.'
echo ""

echo -e "${BLUE}Step 6: Get All Transcripts for Session${NC}"
echo "curl $BASE_URL/transcripts/?session_id=$SESSION_ID"
echo ""

curl -s "$BASE_URL/transcripts/?session_id=$SESSION_ID" | jq '.total, .items[0:3]'
echo ""

echo -e "${BLUE}Step 7: Get Transcripts Grouped by Speaker${NC}"
echo "curl $BASE_URL/transcripts/session/$SESSION_ID/by-speaker"
echo ""

curl -s "$BASE_URL/transcripts/session/$SESSION_ID/by-speaker" | jq '.[0:2]'
echo ""

echo -e "${BLUE}Step 8: Get Juror with Full Transcript${NC}"
echo "curl $BASE_URL/jurors/$JUROR1_ID"
echo ""

curl -s "$BASE_URL/jurors/$JUROR1_ID" | jq '{id, first_name, last_name, speaker_labels, transcript_segment_count: (.transcript_segments | length), first_segment: .transcript_segments[0]}'
echo ""

echo -e "${BLUE}Step 9: Get All Jurors for Session${NC}"
echo "curl \"$BASE_URL/jurors/?session_id=$SESSION_ID\""
echo ""

curl -s "$BASE_URL/jurors/?session_id=$SESSION_ID" | jq '{total, items: [.items[] | {id, seat_number, first_name, last_name, speaker_labels}]}'
echo ""

echo -e "${BLUE}Step 10: Get Session with Stats${NC}"
echo "curl $BASE_URL/sessions/$SESSION_ID"
echo ""

curl -s "$BASE_URL/sessions/$SESSION_ID" | jq '.'
echo ""

echo ""
echo -e "${GREEN}✅ Workflow Complete!${NC}"
echo ""
echo "Summary:"
echo "  Session ID: $SESSION_ID"
echo "  Juror 1 ID: $JUROR1_ID (SPEAKER_A)"
echo "  Juror 2 ID: $JUROR2_ID (SPEAKER_B)"
echo ""
echo "Try these additional queries:"
echo "  # Get transcripts for specific juror:"
echo "  curl \"$BASE_URL/transcripts/?juror_id=$JUROR1_ID\""
echo ""
echo "  # Get transcripts for specific speaker:"
echo "  curl \"$BASE_URL/transcripts/?session_id=$SESSION_ID&speaker_label=SPEAKER_C\""
echo ""
echo "  # Update juror notes:"
echo "  curl -X PUT $BASE_URL/jurors/$JUROR1_ID \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"notes\": \"Updated notes after voir dire\"}'"
echo ""

