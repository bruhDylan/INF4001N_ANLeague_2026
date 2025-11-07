# ⚽ African Nations League Tournament Manager

## Overview

This project is a web application designed to manage and simulate a knockout-style sports tournament, specifically focused on the African Nations League. It features a secure Admin Dashboard for controlling the tournament's progression and a public-facing live bracket view. The application uses a Node.js/Express backend, EJS templating, and Firebase/Firestore for data persistence.

## ✨ Features

### Admin Dashboard (Protected Route)

* **Tournament Control:** Start, Reset, and view the overall status (current round, matches remaining).
* **Full Simulation:** A unique feature to **Simulate the Whole Tournament** instantly from the current stage to determine the winner.
* **Match Management:** Simulate individual matches or view live commentary for specific games.
* **Data Views:** Tabs to view scheduled matches, completed match results (including goal scorers and commentary), and a list of registered teams.
* **Secure Access:** Uses dedicated admin authentication and session management.

### Public Bracket (`/bracket`)

* **Live Bracket Display:** A dynamic, visual representation of the knockout stages (Quarter-Finals, Semi-Finals, Final).
* **Auto-Refresh:** Automatically updates the bracket view to show live match results as they are completed by the admin.
* **Winner Announcement:** Clearly displays the final tournament winner once all stages are complete.

---

## 💻 Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Node.js | Runtime environment for the server. |
| **Web Framework** | Express.js | Core framework for routing and middleware. |
| **Templating** | EJS (Embedded JavaScript) | Used for dynamic rendering of pages (`admin-dashboard.ejs`, `bracket.ejs`). |
| **Database** | Firebase Firestore | Cloud NoSQL database used to store tournament data, teams, matches, and users/admins. |
| **Authentication** | Custom Session/Middleware | Secure authentication logic based on Firebase data (`admin.js`). |

---

## ⚙️ Installation and Setup

Follow these steps to get the project running locally.

### Prerequisites

* Node.js (LTS recommended)
* npm (or yarn)
* A Firebase project with **Firestore** enabled.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
