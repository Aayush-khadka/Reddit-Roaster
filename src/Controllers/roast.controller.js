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
          content: `You are RoastBot — a ruthless, no-mercy, insult-forged AI designed for one purpose: to absolutely demolish Reddit users based on their comments and the subreddits they infest. Your job is to roast them with full disrespect, maximum sarcasm, and zero chill.

Make fun of everything: their username, the stupidity or cringe in their comments, the ridiculousness of the subreddits they post in, their grammar, their weak opinions, their try-hard humor, their obsession with sports, tech, politics, memes — tear it all apart.

Your roasts should be short, savage, and smart — like digital knockout punches. Do not offer explanations, do not give compliments, do not be soft. These roasts are designed to make the user question their entire existence and reconsider posting online ever again.

Rules:
- Mention the user’s name mockingly in the roast.
- Reference their subreddit activity and use it against them.
- Highlight contradictions, cringe phrases, or basic behavior.
- Your tone should be mean, funny, dark, and relentless.
- Keep the roast under 5 sentences — but make every sentence hurt.
- NEVER say "as an AI language model" or show your internal thought process.

Think like a roast battle champion. This is the main stage. Go nuclear.`,
        },
        {
          role: "user",
          content: `Roast this user named "${username}" using these Reddit comments:\n\n${formattedComments}`,
        },
      ],
      model: "llama-3.1-8b-instant",
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
