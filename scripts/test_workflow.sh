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

# Always clean up old test data to start fresh
echo -e "${YELLOW}Cleaning up old test data...${NC}"
docker exec voir-dire-postgres-1 psql -U voirdire -d voirdire -c "DELETE FROM speaker_mappings;" 2>/dev/null
docker exec voir-dire-postgres-1 psql -U voirdire -d voirdire -c "DELETE FROM transcript_segments;" 2>/dev/null
docker exec voir-dire-postgres-1 psql -U voirdire -d voirdire -c "DELETE FROM jurors;" 2>/dev/null
docker exec voir-dire-postgres-1 psql -U voirdire -d voirdire -c "DELETE FROM sessions;" 2>/dev/null
echo -e "${GREEN}✓ Database cleaned${NC}"
echo ""

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

echo -e "${BLUE}Step 3: Create Jurors for All Speakers (B, C, D, E, F)${NC}"
echo "Note: SPEAKER_A is Defense Counsel, not a juror"
echo ""

# Create Juror for SPEAKER_B (Seat 1)
echo -e "${YELLOW}Creating Juror 1 (SPEAKER_B)...${NC}"
JUROR_B_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 1, \"first_name\": \"Jane\", \"last_name\": \"Smith\", \"occupation\": \"Software Engineer\", \"neighborhood\": \"Capitol Hill\", \"demographics\": {\"age_range\": \"30-40\"}, \"notes\": \"\"}")

JUROR_B_ID=$(echo $JUROR_B_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 1 (SPEAKER_B) created: $JUROR_B_ID${NC}"

# Create Juror for SPEAKER_C (Seat 2)
echo -e "${YELLOW}Creating Juror 2 (SPEAKER_C)...${NC}"
JUROR_C_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 2, \"first_name\": \"John\", \"last_name\": \"Doe\", \"occupation\": \"Teacher\", \"neighborhood\": \"Ballard\", \"demographics\": {\"age_range\": \"40-50\"}, \"notes\": \"\"}")

JUROR_C_ID=$(echo $JUROR_C_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 2 (SPEAKER_C) created: $JUROR_C_ID${NC}"

# Create Juror for SPEAKER_D (Seat 3)
echo -e "${YELLOW}Creating Juror 3 (SPEAKER_D)...${NC}"
JUROR_D_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 3, \"first_name\": \"Robert\", \"last_name\": \"Johnson\", \"occupation\": \"Accountant\", \"neighborhood\": \"Fremont\", \"demographics\": {\"age_range\": \"50-60\"}, \"notes\": \"\"}")

JUROR_D_ID=$(echo $JUROR_D_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 3 (SPEAKER_D) created: $JUROR_D_ID${NC}"

# Create Juror for SPEAKER_E (Seat 4)
echo -e "${YELLOW}Creating Juror 4 (SPEAKER_E)...${NC}"
JUROR_E_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 4, \"first_name\": \"Maria\", \"last_name\": \"Garcia\", \"occupation\": \"Nurse\", \"neighborhood\": \"Beacon Hill\", \"demographics\": {\"age_range\": \"35-45\"}, \"notes\": \"\"}")

JUROR_E_ID=$(echo $JUROR_E_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 4 (SPEAKER_E) created: $JUROR_E_ID${NC}"

# Create Juror for SPEAKER_F (Seat 5)
echo -e "${YELLOW}Creating Juror 5 (SPEAKER_F)...${NC}"
JUROR_F_RESPONSE=$(curl -s -X POST $BASE_URL/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"seat_number\": 5, \"first_name\": \"David\", \"last_name\": \"Lee\", \"occupation\": \"Contractor\", \"neighborhood\": \"West Seattle\", \"demographics\": {\"age_range\": \"45-55\"}, \"notes\": \"\"}")

JUROR_F_ID=$(echo $JUROR_F_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Juror 5 (SPEAKER_F) created: $JUROR_F_ID${NC}"
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

# Map SPEAKER_B to Juror 1
echo -e "${YELLOW}Mapping SPEAKER_B to Juror 1...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR_B_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_B"}' | jq '.' 2>/dev/null || echo "OK"
echo ""

# Map SPEAKER_C to Juror 2
echo -e "${YELLOW}Mapping SPEAKER_C to Juror 2...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR_C_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_C"}' | jq '.' 2>/dev/null || echo "OK"
echo ""

# Map SPEAKER_D to Juror 3
echo -e "${YELLOW}Mapping SPEAKER_D to Juror 3...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR_D_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_D"}' | jq '.' 2>/dev/null || echo "OK"
echo ""

# Map SPEAKER_E to Juror 4
echo -e "${YELLOW}Mapping SPEAKER_E to Juror 4...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR_E_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_E"}' | jq '.' 2>/dev/null || echo "OK"
echo ""

# Map SPEAKER_F to Juror 5
echo -e "${YELLOW}Mapping SPEAKER_F to Juror 5...${NC}"
curl -s -X POST $BASE_URL/jurors/$JUROR_F_ID/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_F"}' | jq '.' 2>/dev/null || echo "OK"
echo ""

echo -e "${BLUE}Step 6: Map SPEAKER_A to Defense Counsel (via Session Metadata)${NC}"
echo ""

# Update session metadata to include defense counsel speaker mapping
echo -e "${YELLOW}Mapping SPEAKER_A to Defense Counsel 1...${NC}"
curl -s -X PUT "$BASE_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "judge": "Hon. Test Judge",
      "courtroom": "E-501",
      "speaker_mappings": [
        {
          "speaker_label": "SPEAKER_A",
          "participant_type": "defense",
          "participant_id": "defense-1",
          "participant_name": "Defense Counsel",
          "seat_number": 1
        }
      ]
    }
  }' | jq '.' 2>/dev/null || echo "OK"
echo ""

echo -e "${BLUE}Step 7: Get All Transcripts for Session${NC}"
echo "curl $BASE_URL/transcripts/?session_id=$SESSION_ID"
echo ""

curl -s "$BASE_URL/transcripts/?session_id=$SESSION_ID&limit=10" | jq '.total, .items[0:3]'
echo ""

echo -e "${BLUE}Step 8: Get Transcripts Grouped by Speaker${NC}"
echo "curl $BASE_URL/transcripts/session/$SESSION_ID/by-speaker"
echo ""

curl -s "$BASE_URL/transcripts/session/$SESSION_ID/by-speaker" | jq '[.[] | {speaker_label, segment_count: (.segments | length)}]'
echo ""

echo -e "${BLUE}Step 9: Get Juror 1 with Transcript Segments${NC}"
echo "curl $BASE_URL/jurors/$JUROR_B_ID"
echo ""

curl -s "$BASE_URL/jurors/$JUROR_B_ID" | jq '{id, first_name, last_name, seat_number, speaker_labels, transcript_segment_count: (.transcript_segments | length)}'
echo ""

echo -e "${BLUE}Step 10: Get All Jurors for Session${NC}"
echo "curl \"$BASE_URL/jurors/?session_id=$SESSION_ID\""
echo ""

curl -s "$BASE_URL/jurors/?session_id=$SESSION_ID" | jq '{total, items: [.items[] | {id, seat_number, first_name, last_name, speaker_labels}]}'
echo ""

echo ""
echo -e "${GREEN}✅ Workflow Complete!${NC}"
echo ""
echo "Speaker Mappings:"
echo "  SPEAKER_A → Defense Counsel (stored in session metadata)"
echo "  SPEAKER_B → Juror 1 (Jane Smith)"
echo "  SPEAKER_C → Juror 2 (John Doe)"
echo "  SPEAKER_D → Juror 3 (Robert Johnson)"
echo "  SPEAKER_E → Juror 4 (Maria Garcia)"
echo "  SPEAKER_F → Juror 5 (David Lee)"
echo ""
echo "Summary:"
echo "  Session ID: $SESSION_ID"
echo "  Juror 1 ID: $JUROR_B_ID (SPEAKER_B)"
echo "  Juror 2 ID: $JUROR_C_ID (SPEAKER_C)"
echo "  Juror 3 ID: $JUROR_D_ID (SPEAKER_D)"
echo "  Juror 4 ID: $JUROR_E_ID (SPEAKER_E)"
echo "  Juror 5 ID: $JUROR_F_ID (SPEAKER_F)"
echo ""
echo -e "${BLUE}🌐 Frontend Access${NC}"
echo "  To view this session in the frontend:"
echo ""
echo "  1. Make sure the frontend is running:"
echo "     cd frontend && npm run dev"
echo ""
echo "  2. Open your browser to:"
FRONTEND_URL="http://localhost:5173?session=$SESSION_ID"
echo -e "     ${GREEN}$FRONTEND_URL${NC}"
echo ""
echo "  Or manually load the session by entering the Session ID:"
echo -e "     ${YELLOW}$SESSION_ID${NC}"
echo ""

# Try to open browser automatically (works on macOS and Linux)
if command -v open &> /dev/null; then
    # macOS
    echo -e "${YELLOW}Opening browser...${NC}"
    open "$FRONTEND_URL" 2>/dev/null || true
elif command -v xdg-open &> /dev/null; then
    # Linux
    echo -e "${YELLOW}Opening browser...${NC}"
    xdg-open "$FRONTEND_URL" 2>/dev/null || true
fi

echo ""
echo "Try these additional queries:"
echo "  # Get transcripts for Juror 1 (SPEAKER_B):"
echo "  curl \"$BASE_URL/transcripts/?juror_id=$JUROR_B_ID\""
echo ""
echo "  # Get transcripts for specific speaker:"
echo "  curl \"$BASE_URL/transcripts/?session_id=$SESSION_ID&speaker_label=SPEAKER_A\""
echo ""
echo "  # Update juror notes:"
echo "  curl -X PUT $BASE_URL/jurors/$JUROR_B_ID \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"notes\": \"Updated notes after voir dire\"}'"
echo ""
