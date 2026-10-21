# RTU Program Needs Poll

A one-page poll that asks students, industry, communities and educators to rate eleven proposed academic programs at **Rizal Technological University**. Brought to you by the **Data Science and Smart Analytics Research Center (DSSARC)**.

Each program has two 5-point Likert items:

| Item | Scale |
|---|---|
| **Need:** "This program responds to a real and growing need of industry, the community, and future careers." | 1 Strongly disagree … 5 Strongly agree |
| **Enroll:** "Would you, or someone you know, take this program?" | 1 Definitely not … 5 Definitely yes |

Respondents can rate one, several, or all eleven programs. The site is static and is hosted free on **GitHub Pages**. Responses go straight to a **Google Sheet** that only you can see. Respondents never see the results.

```
rtu-program-poll/
├── index.html            the poll page
├── config.js             ← paste your Google Apps Script URL here
├── assets/
│   ├── app.js            programs, descriptions, form logic, submission
│   ├── style.css
│   ├── rtu-seal.png
│   └── dssarc-logo.png
└── apps-script/
    └── Code.gs           Google Sheets backend (copy into Apps Script)
```

---

## Setup (about 10 minutes)

### 1. Create the Google Sheet
1. Go to [sheets.new](https://sheets.new) while signed in to the Google account that should own the data (for example your RTU account).
2. Name it, for example **RTU Program Needs Poll – Responses**.

### 2. Add the script
1. In the sheet, open **Extensions → Apps Script**.
2. Delete the sample code in `Code.gs` and paste in everything from [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. In the function menu at the top, choose **`setup`** and click **Run**. Approve the permission prompt. The script only touches this one spreadsheet.
   - If you see "Google hasn't verified this app", click **Advanced → Go to (project name)**. This is normal for your own scripts.
4. Back in the sheet you now have two tabs:
   - **Responses**: one row per respondent.
   - **Summary**: mean, count, and % rating 4–5 for every program, updated automatically.

### 3. Deploy the script as a web app
1. In Apps Script click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** **Anyone** (the poll page must be able to send responses without signing in; nobody can *read* the sheet through it)
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
5. Optional check: open that URL in your browser. You should see `{"ok":true,...}`.

### 4. Connect the site
Open `config.js` and paste the URL:

```js
window.POLL_CONFIG = {
  sheetEndpoint: "https://script.google.com/macros/s/AKfy.../exec"
};
```

### 5. Publish on GitHub Pages
1. Create a new repository on GitHub, for example `rtu-program-poll`, and upload all files in this folder (or `git push` them).
2. In the repository open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**, then **Save**.
4. After a minute your poll is live at `https://<your-username>.github.io/rtu-program-poll/`.

Submit one test response and check that a row appears in **Responses**. Then delete the test row.

---

## How it works

- **No sign-in for respondents.** Anyone with the link can answer.
- **One row per person per device.** The browser keeps a random respondent ID. If someone returns on the same device, their earlier answers load into the form and resubmitting **updates** their row instead of adding a duplicate. *Times submitted* counts how often they updated. Someone could still answer twice from different devices or browsers. Check the timestamps if that matters for your analysis.
- **Anonymous.** No names, emails, or IP addresses are collected. The data is the role, the ratings, an optional suggested program, and an optional comment.
- **Spam protection.** A hidden honeypot field drops most bots, and the script rejects unknown roles and scores outside 1–5. Text that starts with `=`, `+`, `-` or `@` is neutralised so it can't run as a formula.

## Changing things later

| To change… | Edit |
|---|---|
| Introduction, logos, footer | `index.html` |
| Program names, descriptions, Likert wording | `assets/app.js` (`PROGRAMS`, `SCALES`) |
| Respondent roles | `assets/app.js` (`ROLES`) **and** `apps-script/Code.gs` (`ROLES`) |
| Adding or removing a program | `assets/app.js` **and** `Code.gs` (`PROGRAMS`), then run `setup()` again on a **new** sheet. Changing columns mid-poll will misalign existing rows. |

After editing `Code.gs`, deploy again with **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

## Analysing the data
- **Summary** tab for quick ranking: sort by *Need · mean* or *Enroll · mean*.
- **File → Download → CSV** for R, Python, SPSS or JASP. The columns are `NEED · <program>` and `ENROLL · <program>`, with a blank cell where a program was not rated.
- Filter the **Responses** tab by **Role** to compare students, industry, community and faculty.

---

© Rizal Technological University · Data Science and Smart Analytics Research Center: *Your partner in providing smart solutions.*
