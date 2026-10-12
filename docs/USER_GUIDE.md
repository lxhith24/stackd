# Stackd v1 — user guide

[Open Stackd](https://stackd.stable-ox-2933.chatgpt.site/)

Stackd keeps track of poker sessions, buy-ins, rebuys and results. You can record your own games or host a table for friends and guests. Amounts are entered manually; Stackd does not receive money, verify bank transfers or send payouts.

## Get started

1. Open Stackd and select **Sign in with ChatGPT**.
2. Sign in with the account you want to use for your poker history. Use that same account on other devices.
3. If the setup screen appears, enter your player name. **INR** is selected by default.
4. Select **Create my ledger**.

If you first arrive through a session invitation, signing in returns you to the invitation. Joining can create your ledger automatically; you can review your name and currency in **Settings** afterward.

## Find your way around

| Tab | What you can do |
| --- | --- |
| **Overview** | See your completed-game results and open your active hosted game |
| **Sessions** | Create games, view hosted/joined sessions, filter history and export summaries |
| **Friends** | Find your four-digit code, add friends and manage requests |
| **Settings** | Edit preferences, export records and sign out |

The refresh icon beside the tabs reloads your ledger. The app also refreshes periodically when you are not editing.

## Add friends

1. Open **Friends**.
2. Share **Your friend code**, or enter another player’s four-digit code under **Enter another player’s code**.
3. Select **Add friend**.
4. The recipient opens **Friends** and selects **Accept** under **Friend requests**.

Keep any leading zeros: `0042` is a valid four-digit code. A player must sign in to Stackd once before they receive their code. A pending request becomes a friendship only after acceptance.

You can also select **Add friend** beside a registered player under **Players at this table** inside a session. Manage that request in the Friends tab.

**Decline** dismisses an incoming request, **Cancel** withdraws an outgoing request, and **Unfriend** removes an accepted friendship. Unfriending does not remove previous shared sessions.

## Host a group session

1. Select **New session** from Overview or Sessions. **Host a group** is selected by default.
2. Optionally enter a session name and stakes, such as `10 / 20`. Games use Texas Hold’em.
3. Under **Players & buy-ins**, enter your initial buy-in. Your player is marked **You**.
4. Add the other players using the options below.
5. Under **Session details**, check the **Start date** and leave **Status** as **In progress**. Start time and venue are optional.
6. Add notes if needed, then select **Save session**.

Enter amounts in rupees, such as `500` or `500.50`, without a currency symbol or comma. Buy-ins must be greater than zero. Leave a cash-out blank until you know it.

### Three ways to add players

| Option | Use it when | How it works |
| --- | --- | --- |
| **Add guest** | You are tracking someone by name on your device | Enter their name and initial buy-in. They do not need an account. |
| **Add friend** | The player is already an accepted friend | Choose them from your list. Their session appears in their own ledger after you save. |
| **Copy invite link** | Players should join from their own devices | Save the group first, then share the link from **Invite players**. Friendship is optional. |

The session’s Add friend control is unavailable when there are no eligible accepted friends. Add friends in the Friends tab first. A friend already at the table cannot be added twice.

Friends and players joining by link can appear with no buy-in recorded yet. The host uses **Record buy-in** on their player card to enter it. You can add more players later through **Edit session** or the invitation link. A session supports up to 30 players.

A named guest is not automatically connected to a registered account, even if their names match. For players who want their own session history, use Add friend or the invitation link from the beginning. Avoid adding the same person both as a guest and as a registered participant.

You can have one active hosted session at a time. Finish it before starting another active game. Recording completed historical games and joining other hosts’ games remain available.

## Invite or join a game

### Host: share an invitation

1. Open your saved, active group session.
2. Under **Invite players**, select **Copy invite link**.
3. Share the link with the intended players. If copying is unavailable, copy the displayed link manually.

Anyone with the link can sign in and join while the session is active. **Replace link** creates a new invitation and disables the previous link; existing members remain in the session.

### Player: join an invitation

1. Open the host’s link.
2. If prompted, select **Sign in with ChatGPT**. After signing in, you return to the invitation.
3. Check the session title and host, then select **Join session**.
4. The session opens and appears in your **Sessions** tab.

If you are already a member, select **Open your session**. You do not need to be the host’s friend. A completed session cannot accept new players.

## Understand host and player access

| Person | What they can see and change |
| --- | --- |
| **Host** | All players’ buy-ins, rebuys and cash-outs; edit the game, invite players and finish the session |
| **Registered participant** | Their own amounts and the registered-player roster; amounts are read-only |
| **Named guest** | Their records are maintained by the host; no personal account access is created |

Participants should ask the host to correct an amount. The host’s notes and other players’ amounts are not shown to participants. Registered players’ names and friend codes are available for adding friends within the session.

## Record a rebuy or cash-out

Only the host can record or change session amounts.

- **Initial buy-in:** enter it when creating the player, or select **Record buy-in** for a registered player waiting for their first entry.
- **Rebuy:** select **Rebuy** on the player’s card, enter the additional amount, then **Save entry**. Enter only the new rebuy, not their running total.
- **Cash-out:** select **Set cash-out**, enter the total amount the player leaves with, then **Save entry**. Use **Edit cash-out** to correct it.
- **Other corrections:** select **Edit session** to correct existing amounts, add/remove rebuys or adjust session details, then save.

Rebuys do not require you to enter a date or time. Cash-out `0` means the player finished with nothing; a blank cash-out means it is still unknown. Recording a cash-out records a result—it does not send money.

## Finish a session

1. Open the active game and select **Finish session**.
2. Check that every player has an initial buy-in and all rebuys recorded.
3. Enter every player’s cash-out, including `0` when appropriate.
4. Optionally enter an end date/time. Exact start and end times are needed for duration and hourly results; date-only games still count toward profit and session totals.
5. Select **Save completed session**.

For group sessions, Stackd compares total buy-ins with total cash-outs. If they differ, use **Review amounts** to look for missing entries. When the difference is intentional, such as money taken from the table for a recorded external cost, **Save with difference** keeps that discrepancy visible.

Completed games appear in personal results. New players cannot join once the session is completed. The host can still use **Edit session** to correct saved records.

## Record a personal or past game

For a game where you only want to track yourself, create a new session and change **Session type** to **Personal session** before adding other players. Enter your own buy-ins and cash-out.

For a past game, choose **Completed / historical** under Status, set its start date, and enter the player records and cash-outs. You can leave exact times blank. For an old game without reliable timing information, date-only entry is the simplest option.

## Read your results

Your Overview uses your own player’s results from completed sessions you host or join. Other players’ wins and losses do not change your personal totals.

| Metric | Meaning |
| --- | --- |
| **Net profit / loss** | Your cash-outs minus your initial buy-ins and rebuys |
| **Total invested** | Your combined buy-ins and rebuys in completed sessions |
| **Sessions played** | Number of completed sessions in the selected ledger currency |
| **Time at the table** | Combined duration of completed sessions with exact start and end times |
| **Hourly result** | Profit from timed completed sessions divided by their total hours |
| **Results over time** | Your cumulative profit/loss across completed games |

For example, an initial buy-in of ₹500, a ₹200 rebuy and a ₹900 cash-out produces **₹700 invested** and **₹200 profit**.

Active games are excluded from completed-session totals, even if some cash-outs have been entered. Overview totals use your ledger currency; sessions in another currency remain in history without conversion.

## Find, export and share records

Open **Sessions** to filter by **From**, **To**, or **Venue**. Select a session name to open its details. **Clear filters** restores the full list.

- **Export CSV** in Sessions downloads session summaries.
- **Settings → Session summaries CSV** exports summaries.
- **Settings → Buy-ins & rebuys CSV** exports individual entries.
- **Copy summary** inside a session copies a readable summary for you to share.

Exports and copied summaries include only the records available to your account: hosts can export their table’s player records, while participants receive their own financial records. The export buttons download the full available ledger rather than just the current filtered view. CSV files can be opened in a spreadsheet application.

## Preferences and saving

In **Settings**, change your name and select **Save preferences**. Currency selection is disabled in the interface while you have saved sessions. Stackd does not convert existing amounts between currencies.

Use the same ChatGPT account to see your records on another phone or computer. Saved records are stored online and do not depend on the host’s laptop staying on. Internet access is required to save; wait for the saved confirmation before closing a form. Reloading or closing a form discards unsaved edits.

Use **Sign out** in Settings when finished on a shared device.

## Common questions

**I cannot edit my buy-ins.** You joined someone else’s session. Ask the host to update your entries.

**I do not see the host’s latest change.** Wait briefly or use the refresh icon after closing any open editor. Check that you are signed in with the same account used to join.

**The invitation is invalid or the session has ended.** Ask the host for the latest active invitation. Replaced links stop working, and completed sessions cannot accept new players.

**My friend does not appear in the session’s Add friend list.** Confirm that the request was accepted and the friend is not already at the table. Open the Friends tab to refresh the list.

**A save says the session changed on another device.** Another edit or player joining updated the game. Note your intended corrections, reload the latest session and apply them again.

**My new game is missing from Overview totals.** Check that it is completed and uses your ledger currency. Active games remain in Sessions.

**Can I undo deleting a session?** There is no in-app undo. **Delete session** removes the session and entries from the host’s and participants’ histories. Export records first if you need a copy.

**What happens when a host removes me from a session?** You lose access to that session in your history. Unfriending someone alone does not remove session history.

**Does Stackd confirm PhonePe/UPI transfers or settle payouts?** No payment integration is included in v1. The host verifies transfers and pays players separately, then records the relevant amounts in Stackd.
