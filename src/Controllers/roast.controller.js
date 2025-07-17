import Snoowrap from "snoowrap";
import { asynchandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_2 });

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

    if (now.getDate() < createdDate.getDate()) {
      totalMonths -= 1;
    }

    const displayYears = Math.floor(totalMonths / 12);
    const displayMonths = totalMonths % 12;

    const accountAgeFormatted =
      displayYears > 0
        ? `${displayYears} year(s)${
            displayMonths > 0 ? ` and ${displayMonths} month(s)` : ""
          }`
        : `${displayMonths} month(s)`;

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

    const roastPrompt = `User Info:
- Username: ${username}
- Total Karma: ${totalKarma}
- Comment Karma: ${commentKarma}
- Link Karma: ${linkKarma}
- Account Age: ${accountAgeFormatted}
- Is Moderator: ${isMod}
- Has Reddit Premium: ${isGold}

Recent Reddit Comments:
${formattedComments}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are RoastBot — a savage, zero-mercy insult machine engineered for one purpose: to obliterate Reddit users with ruthless wit, brutal sarcasm, and devastating precision.

You're not here to educate. You're here to entertain and annihilate.
Your job:

    Analyze the user’s Reddit comments and behavior.

    Sniff out hypocrisy, cringe, desperation, bad jokes, wannabe intellects, weak opinions, edgy try-hards, lonely ramblers, and terminally online behavior.

    If a username is clearly a joke or too try-hard, mock that too — but don’t force it if it's not funny.

Your style:

    Dark humor, stand-up roast battle energy, late-night insult monologue vibes.

    Witty, punchy, clever — never boring, never generic, never robotic.

    Use irony, exaggeration, comparison, and sarcasm like a scalpel.

    Write like you're speaking to a live audience — every line should either get a laugh or a gasp.

What NOT to do:

    Don’t say you’re an AI or mention “as an assistant”.

    Don’t soften the roast.

    Don’t explain the joke or give disclaimers.

    Don’t be cringey or try too hard — flow like a pro comic, not a 14-year-old edgelord.

Format:

    Write a roast that's 4 to 7 sentences long.

    Start with a bold statement or observation about the user’s vibe or behavior.

    Use 1–2 specific references from their Reddit comments or subreddit habits if available.

    Land with a killer closing line — funny, savage, or humiliating.

Your roast should leave them laughing, but also rethinking their life choices. Maximum impact. Zero chill.`,
        },
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
${formattedComments}

Instructions:
- Directly insult the user's username.
- Use their karma stats and account age to mock their Reddit status.
- Make fun of the quality or cringe factor in their comments.
- Reference specific subreddits if needed.
- Be sarcastic, dark, clever, and ruthless.
- Keep the roast under 5 sentences.
- DO NOT praise the user.
- DO NOT soften the roast.
- DO NOT explain the joke.
- DO NOT mention you are an AI or assistant.

Write like you’re in the finals of a roast battle. Every sentence should sting.`,
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

    return res.status(200).json(
      new ApiResponse(
        200,
        {
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
        "Successfully roasted the user."
      )
    );
  } catch (error) {
    console.error("Roast error:", error);
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
