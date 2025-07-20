import Snoowrap from "snoowrap";
// Fix the utils import paths - since utils is at root level, not inside src
import { asynchandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();

const groqKeys = [
  process.env.GROQ_API_1,
  process.env.GROQ_API_2,
  process.env.GROQ_API_3,
  process.env.GROQ_API_4,
];

const r = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const SYSTEM_PROMPT = `You are RoastBot — a savage, foul-mouthed insult demon. Your only job: obliterate Reddit users with dark, original, NSFW comedy. No mercy, no filter.

Roast them based on their:
- Cringe subs
- Simping streaks
- Karma chasing
- Toxic overshares
- Try-hard usernames
- Repeated post/comment behavior

Treat their Reddit history like a weapon. Humiliate with precision.

Style:
- Ruthless. Unhinged. Satirically filthy.
- Think Jeselnik + a pissed Nepali uncle.
- Use shocking metaphors, cultural jabs, twisted humor.
- NSFW is allowed — clever filth only.
- Include Nepali burns when fitting ("confidence of a traffic cop in rain", "mamaghar energy", "Melamchi-level delusion").

Never:
- Use cliché roasts like "mom's basement", "touch grass", "participation trophy"
- Repeat punchlines or formats
- Mention AI or apologize
- Soften tone or compliment the user

Roast Structure:
- Start brutal: summarize their Reddit vibe in 1 line
- Mid roast: mock 2+ specific behaviors, subs, or patterns
- End with a fatality: twisted punchline or existential insult

Instructions:
- Directly insult the user's username
- Use their karma and account age to mock their Reddit status
- Make fun of the quality or cringe factor in their comments
- Reference specific subreddits if needed
- Be sarcastic, dark, clever, and ruthless
- Keep the roast under 5 sentences
- DO NOT praise the user
- DO NOT soften the roast
- DO NOT explain the joke
- DO NOT mention you are an AI or assistant

Be creative. Vary tone and delivery. Every roast should feel handcrafted. You're not a bot — you're the final boss of the internet. Make them regret logging in.`;

async function tryGroqRequest(payload) {
  for (let i = 0; i < groqKeys.length; i++) {
    const apiKey = groqKeys[i];
    const groq = new Groq({ apiKey });

    try {
      const response = await groq.chat.completions.create(payload);
      return response;
    } catch (err) {
      console.error(`Groq API key ${i + 1} failed:`, err.message);
      if (err.response?.data) {
        console.error("Groq response:", err.response.data);
      }

      if (err?.code === "rate_limit_exceeded" || err?.status === 429) {
        console.warn(`Rate limit hit for API key ${i + 1}. Trying next key...`);
        continue;
      } else {
        throw err;
      }
    }
  }

  throw new Error(
    "All GROQ API keys failed due to rate limit or other issues."
  );
}

export const generateRoast = asynchandler(async (req, res) => {
  try {
    const username = req.params.username;
    const user = await r.getUser(username).fetch();

    const profileImage = user.icon_img || null;
    const linkKarma = user.link_karma || 0;
    const commentKarma = user.comment_karma || 0;
    const totalKarma = linkKarma + commentKarma;
    const isMod = user.is_mod || false;
    const isGold = user.is_gold || false;

    const createdDate = new Date(user.created_utc * 1000);
    const now = new Date();
    let totalMonths =
      (now.getFullYear() - createdDate.getFullYear()) * 12 +
      (now.getMonth() - createdDate.getMonth());
    if (now.getDate() < createdDate.getDate()) totalMonths -= 1;

    const displayYears = Math.floor(totalMonths / 12);
    const displayMonths = totalMonths % 12;
    const accountAgeFormatted =
      displayYears > 0
        ? `${displayYears} year(s)${
            displayMonths ? ` and ${displayMonths} month(s)` : ""
          }`
        : `${displayMonths} month(s)`;

    const comments = await r.getUser(username).getComments({ limit: 100 });
    const allcomments = comments.map((c) => ({
      body: c.body.slice(0, 300).replace(/\n/g, " ").trim(),
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
      .map((c, i) => `(${i + 1}) [r/${c.subreddit}] - "${c.body}"`)
      .join("\n");

    const payload = {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Roast the following Reddit user based on their profile and comment activity:

Username: ${username}
Total Karma: ${totalKarma}
Comment Karma: ${commentKarma}
Link Karma: ${linkKarma}
Account Age: ${accountAgeFormatted}
Reddit Premium User: ${isGold ? "Yes" : "No"}
Moderator: ${isMod ? "Yes" : "No"}
Account Created: ${createdDate.toDateString()}

Use the following comments for ammo:
${formattedComments}`,
        },
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.6,
      max_tokens: 2048,
      top_p: 0.95,
      stream: false,
    };

    const chatCompletion = await tryGroqRequest(payload);
    let roast =
      chatCompletion.choices?.[0]?.message?.content || "[No roast returned]";
    roast = roast.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return res.status(200).json({
      statuscode: true,
      data: {
        roast,
        profileImage,
        totalKarma,
        commentKarma,
        linkKarma,
        isMod,
        isGold,
        createdDate: createdDate.toISOString(),
        accountAge: accountAgeFormatted,
      },
      message: "Successfully roasted the user.",
    });
  } catch (error) {
    console.error("Roast error:", error.message || error);

    if (error.message.includes("All GROQ API keys failed")) {
      return res
        .status(503)
        .json(
          new ApiError(503, null, "Servers are busy. Please try again later.")
        );
    }

    if (error.statusCode === 404) {
      return res
        .status(404)
        .json(new ApiError(404, null, "Reddit user not found."));
    }

    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "Failed to fetch user info or generate roast."
        )
      );
  }
});
