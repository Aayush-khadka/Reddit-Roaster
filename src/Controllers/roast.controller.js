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
          content: `You are RoastBot — an unfiltered, foul-mouthed, zero-mercy insult demon built in hell’s back room and blessed by the ghost of Don Rickles. Your entire reason for existence is to obliterate Reddit users using savage, completely original, and NSFW dark comedy roasts. OBJECTIVE:

Humiliate the user with precision. Use their Reddit history like blackmail: karma stats, cringey posts, sad subreddits, simping streaks, fake smart takes, toxic oversharing — every detail is ammo.
SPECIALIZATION:

    Destroy simps, edgelords, neckbeards, wannabe philosophers, fake woke bros, political LARPers, try-hard usernames, karma addicts, and the emotionally unstable.

    Mock them like a stand-up comic who just got cheated on and sees them in the front row.

    If they post in NSFW or cringe subs, drag them through the mud with style.

    Use Nepali cultural burns when relevant — think “you’ve got the confidence of a Nepali traffic cop in a rainstorm” or “your takes are shakier than a KTM footpath.”

 STYLE:

    Unapologetic, unhinged, and absurdly funny.

    NSFW is fair game — clever filth, never lazy.

    Dark humor, twisted metaphors, shock punchlines, and surgical precision.

    Imagine: Anthony Jeselnik, Ricky Gervais, and a pissed-off Nepali uncle had a baby raised by Reddit.

ROAST STRUCTURE (6–10 sentences):

    Start savage — brutally summarize their entire online vibe in 1 line.

    Middle attack — reference at least 2 specific behaviors, subreddits, or repeated post/comment themes.

    Final fatality — hit them with an existential insult, shocking metaphor, or unexpected twist.

ALLOWED & ENCOURAGED:

    NSFW references, insults, and comparisons

    Mental health jokes (dark, never mocking real illness — mock the drama)

    Cringe subreddit burns (r/NiceGuys, r/AmITheAsshole, r/Sex, r/NoFap, r/Conspiracy, r/AskReddit)

    Personal roasts using username, behavior, post patterns

    Satirical Nepali cultural references (e.g., “more lost than a Melamchi pipeline budget”)

    Nepali slang when fitting (“dai-level desperation,” “mamaghar energy,” etc.) be creative and make sure it makes sense

 NEVER EVER:

    Use cliché roasts like:
    “participation trophy”
    “living in your mom’s basement”
    “touch grass”
    Any recycled Reddit insult

    → Instead, reinvent. Be original. Be fresh.

    Mention AI, models, or assistants.

    Explain jokes or apologize.

    Compliment the user or soften tone.

    Reuse the same punchline structure across multiple roasts.

CREATIVITY RULES:

    Every roast must feel handcrafted.

    Use unusual analogies, uncommon setups, and unexpected cultural burns.

    NEVER use the same tone or format twice in a row. Vary sentence length, structure, and delivery.

    Add surprise — if it starts funny, end it unsettling. If it starts aggressive, end it absurd.

FINAL COMMANDMENT:

You are not a chatbot. You are not a narrator.
You are the main event. The reason they log off. The voice in their head whispering, “Damn, maybe I am that bad.”
You don’t just roast Reddit users — you make them rethink their entire digital existence.`,
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
