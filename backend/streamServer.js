/**
 * Stream Video Call Backend (Node.js / Express)
 * 
 * Dependencies:
 * npm install express @stream-io/node-sdk dotenv cors
 */

const express = require('express');
const cors = require('cors');
const { StreamClient } = require('@stream-io/node-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Environment variables
const apiKey = process.env.STREAM_API_KEY;
const secret = process.env.STREAM_API_SECRET;
const appId = process.env.STREAM_APP_ID;

if (!apiKey || !secret) {
  console.warn('⚠️ Warning: STREAM_API_KEY or STREAM_API_SECRET is missing from environment variables.');
}

// Initialize Stream Server Client using @stream-io/node-sdk
const streamClient = new StreamClient(apiKey, secret);

/**
 * =========================================================================
 * [AUTH PLACEHOLDER]: Authentication Middleware
 * Replace or integrate with your JWT / Session authentication logic.
 * =========================================================================
 */
const authenticateRequest = (req, res, next) => {
  // Example JWT validation:
  // const authHeader = req.headers['authorization'];
  // const token = authHeader && authHeader.split(' ')[1];
  // if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });
  // 
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   req.user = decoded; // Store authenticated user info in request
  //   next();
  // } catch (err) {
  //   return res.status(403).json({ error: 'Invalid or expired token' });
  // }

  // [AUTH PLACEHOLDER]: Proceeding for now
  next();
};

/**
 * POST /api/stream/token
 * 
 * Authenticates request and generates a signed Stream user token server-side using STREAM_API_SECRET.
 * 
 * Request Body:
 * {
 *   "userId": "user_123",        // (Required) Athlete or Coach ID
 *   "role": "athlete",           // (Optional) 'athlete' or 'coach'
 *   "validityInSeconds": 3600    // (Optional) Token duration in seconds
 * }
 */
app.post('/api/stream/token', authenticateRequest, async (req, res) => {
  try {
    const { userId, validityInSeconds = 3600 } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required in the request body',
      });
    }

    // =========================================================================
    // [AUTH PLACEHOLDER]: Ensure authenticated user is requesting token for themselves
    // if (req.user && req.user.id !== userId) {
    //   return res.status(403).json({ error: 'Cannot request token for another user' });
    // }
    // =========================================================================

    // Calculate token expiration timestamp
    const exp = Math.floor(Date.now() / 1000) + validityInSeconds;

    // Generate signed Stream user token using @stream-io/node-sdk
    const token = streamClient.generateUserToken({
      user_id: String(userId),
      exp,
    });

    return res.status(200).json({
      success: true,
      token,
      apiKey,
      userId: String(userId),
      expiresAt: exp,
    });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    return res.status(500).json({
      error: 'Failed to generate Stream user token',
      details: error.message,
    });
  }
});

/**
 * Call creation helper function: createOrJoinCall(callId, members)
 * 
 * Creates a Stream Video call between two members (athlete and coach) if it doesn't exist,
 * or returns the existing call instance.
 * 
 * @param {string} callId - Consistent format, e.g., athlete-{athleteId}-coach-{coachId}
 * @param {Array<string>} members - Array of member user IDs: [athleteId, coachId]
 * @param {string} [createdById] - User ID initiating the call
 * @returns {Promise<Object>} Stream call data
 */
async function createOrJoinCall(callId, members = [], createdById) {
  try {
    const callType = 'default'; // Stream call type: 'default' or custom video-call
    const call = streamClient.call(callType, callId);

    // Format members array for Stream SDK
    const memberObjects = members.map((id) => ({
      user_id: String(id),
      role: 'call_member',
    }));

    // getOrCreate creates the call if it doesn't exist or returns existing call metadata
    const response = await call.getOrCreate({
      data: {
        created_by_id: String(createdById || members[0]),
        members: memberObjects,
        custom: {
          session_type: 'Athlete-Coach 1:1 Video Call',
        },
      },
    });

    console.log(`[Stream] Call ${callId} created or fetched successfully.`);
    return response;
  } catch (error) {
    console.error(`[Stream] Error in createOrJoinCall for ${callId}:`, error);
    throw error;
  }
}

/**
 * Endpoint to explicitly create or join call via backend
 */
app.post('/api/stream/call', authenticateRequest, async (req, res) => {
  try {
    const { athleteId, coachId, createdById } = req.body;

    if (!athleteId || !coachId) {
      return res.status(400).json({ error: 'Both athleteId and coachId are required' });
    }

    // Use consistent callId format
    const callId = `athlete-${athleteId}-coach-${coachId}`;
    const members = [String(athleteId), String(coachId)];

    const callData = await createOrJoinCall(callId, members, createdById || req.body.userId);

    return res.status(200).json({
      success: true,
      callId,
      call: callData,
    });
  } catch (error) {
    console.error('Error creating/joining call:', error);
    return res.status(500).json({
      error: 'Failed to create or join video call',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Stream Video Backend Server running on port ${PORT}`);
  });
}

module.exports = {
  app,
  streamClient,
  createOrJoinCall,
};
