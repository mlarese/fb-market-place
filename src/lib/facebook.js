import axios from 'axios';
import { getSecret } from './secrets.js';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Read a Facebook post by ID (STORY-066)
 */
export async function getPost(postId) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  try {
    const response = await axios.get(`${GRAPH_API_URL}/${postId}`, {
      params: {
        access_token: pageToken,
        fields: 'id,message,created_time,from,attachments{media,url},permalink_url',
      },
    });

    return {
      id: response.data.id,
      message: response.data.message,
      createdTime: response.data.created_time,
      from: response.data.from,
      attachments: response.data.attachments?.data || [],
      permalinkUrl: response.data.permalink_url,
    };
  } catch (error) {
    console.error('Error fetching post:', error.response?.data || error.message);
    throw new Error(`Failed to fetch post: ${error.message}`);
  }
}

/**
 * Get user profile from Facebook
 */
export async function getUserProfile(userId, accessToken) {
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${userId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,first_name,last_name,email,picture',
      },
    });

    return {
      facebookId: response.data.id,
      name: response.data.name,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      email: response.data.email,
      picture: response.data.picture?.data?.url,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
}

/**
 * Validate and exchange short-lived token for long-lived token
 */
export async function exchangeToken(shortLivedToken) {
  const appId = await getSecret('FACEBOOK_APP_ID');
  const appSecret = await getSecret('FACEBOOK_APP_SECRET');

  try {
    const response = await axios.get(`${GRAPH_API_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in, // Usually 60 days
    };
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    throw new Error(`Failed to exchange token: ${error.message}`);
  }
}

/**
 * Debug/validate a Facebook token
 */
export async function debugToken(inputToken) {
  const appId = await getSecret('FACEBOOK_APP_ID');
  const appSecret = await getSecret('FACEBOOK_APP_SECRET');

  try {
    const response = await axios.get(`${GRAPH_API_URL}/debug_token`, {
      params: {
        input_token: inputToken,
        access_token: `${appId}|${appSecret}`,
      },
    });

    const data = response.data.data;
    return {
      isValid: data.is_valid,
      appId: data.app_id,
      userId: data.user_id,
      scopes: data.scopes,
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null,
      issuedAt: data.issued_at ? new Date(data.issued_at * 1000) : null,
    };
  } catch (error) {
    console.error('Error debugging token:', error.response?.data || error.message);
    return { isValid: false, error: error.message };
  }
}

/**
 * Publish a post to a page or group
 */
export async function publishPost(targetId, message, options = {}) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  try {
    const payload = { message };

    if (options.link) {
      payload.link = options.link;
    }

    const response = await axios.post(
      `${GRAPH_API_URL}/${targetId}/feed`,
      payload,
      {
        params: { access_token: pageToken },
      }
    );

    return { postId: response.data.id };
  } catch (error) {
    console.error('Error publishing post:', error.response?.data || error.message);
    throw new Error(`Failed to publish post: ${error.message}`);
  }
}

/**
 * Get comments on a post (STORY-067)
 */
export async function getPostComments(postId, options = {}) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');
  const { limit = 50, after = null } = options;

  try {
    const params = {
      access_token: pageToken,
      fields: 'id,message,from{id,name},created_time,attachment,comment_count',
      limit,
    };

    if (after) {
      params.after = after;
    }

    const response = await axios.get(`${GRAPH_API_URL}/${postId}/comments`, { params });

    return {
      comments: (response.data.data || []).map(c => ({
        id: c.id,
        message: c.message,
        from: c.from,
        createdTime: c.created_time,
        attachment: c.attachment,
        replyCount: c.comment_count || 0,
      })),
      paging: response.data.paging,
      hasMore: !!response.data.paging?.next,
    };
  } catch (error) {
    console.error('Error fetching comments:', error.response?.data || error.message);
    return { comments: [], hasMore: false };
  }
}

/**
 * Refresh a long-lived token (STORY-063)
 * Long-lived tokens can be refreshed before they expire
 */
export async function refreshToken(longLivedToken) {
  const appId = await getSecret('FACEBOOK_APP_ID');
  const appSecret = await getSecret('FACEBOOK_APP_SECRET');

  // First check if token is valid and get expiration
  const tokenInfo = await debugToken(longLivedToken);

  if (!tokenInfo.isValid) {
    throw new Error('Token is invalid or expired');
  }

  // If token expires in more than 24 hours, we can refresh it
  const now = new Date();
  const expiresAt = tokenInfo.expiresAt;
  const hoursUntilExpiry = expiresAt ? (expiresAt - now) / (1000 * 60 * 60) : 0;

  if (hoursUntilExpiry > 24) {
    // Token is still valid, exchange for a new long-lived token
    try {
      const response = await axios.get(`${GRAPH_API_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: longLivedToken,
        },
      });

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
        refreshedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  } else {
    // Token is about to expire, user needs to re-authenticate
    throw new Error('Token expires soon and cannot be refreshed. User must re-authenticate.');
  }
}

/**
 * Get page access token from user token (STORY-063)
 */
export async function getPageAccessToken(userAccessToken, pageId) {
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${pageId}`, {
      params: {
        access_token: userAccessToken,
        fields: 'access_token',
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting page token:', error.response?.data || error.message);
    throw new Error(`Failed to get page access token: ${error.message}`);
  }
}

/**
 * Reply to a comment (STORY-067)
 */
export async function replyToComment(commentId, message) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  try {
    const response = await axios.post(
      `${GRAPH_API_URL}/${commentId}/comments`,
      { message },
      { params: { access_token: pageToken } }
    );

    return { commentId: response.data.id };
  } catch (error) {
    console.error('Error replying to comment:', error.response?.data || error.message);
    throw new Error(`Failed to reply to comment: ${error.message}`);
  }
}

export default {
  getPost,
  getUserProfile,
  exchangeToken,
  debugToken,
  publishPost,
  getPostComments,
  refreshToken,
  getPageAccessToken,
  replyToComment,
};
