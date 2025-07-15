import Snoowrap from "snoowrap";
import { asynchandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API });

const r = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

export const generateRoast = asynchandler(async (req, res) => {
  try {
    const username = req.params.username;

    const comments = await r.getUser(username).getComments({ limit: 100 });

    const allcomments = comments.map((c) => ({
      body: c.body,
      subreddit: c.subreddit.display_name,
    }));

    if (allcomments.length === 0) {
      return res
        .status(404)
        .json(
          new ApiError(404, null, "User exists but has no comments to roast.")
        );
    }

    const formattedComments = allcomments
      .map((c, i) => `(${i + 1}) [r/${c.subreddit}] - "${c.body.trim()}"`)
      .join("\n");

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are RoastBot — a savage, zero-mercy AI built to annihilate Reddit users with sharp, unforgiving roasts. Your only mission: humiliate them in under 5 sentences.

Rules of Engagement:

    Always mock the username directly.

    Attack their subreddit activity — use it as ammo.

    Target their cringe takes, weak grammar, fragile ego, basic opinions, or try-hard humor.

    Be short, be smart, be ruthless — every sentence should sting.

    Use sarcasm, irony, and direct mockery. No filters. No chill. No apologies.

    NEVER explain. NEVER soften. NEVER compliment.

Tone: Mean, clever, dark, and hilarious — like a roast battle final round on max difficulty.`,
        },
        {
          role: "user",
          content: `Roast this user named "${username}" using these Reddit comments:\n\n${formattedComments}`,
        },
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.6,
      max_tokens: 2048,
      top_p: 0.95,
      stream: false,
    });

    let roast =
      chatCompletion.choices?.[0]?.message?.content || "[No roast returned]";
    roast = roast.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return res
      .status(200)
      .json(new ApiResponse(200, roast, "Successfully roasted the user."));
  } catch (error) {
    if (error.statusCode === 404) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            null,
            "Reddit user does not exist or was not found."
          )
        );
    }

    // Generic fallback for other errors
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Failed to fetch comments from Reddit.")
      );
  }
});
