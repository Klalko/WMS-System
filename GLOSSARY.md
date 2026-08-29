# GLOSSARY.md — WMS Project Glossary

This file is the single source of truth for all terminology used in this project.
All agents, contributors, and reviewers must adhere to these definitions strictly.

---

## Personas

| Term | Definition |
|---|---|
| **You / The Agent** | The AI executing this project autonomously. |
| **Maker** | The persona/sub-agent responsible for *writing* code and *implementing* features. The Maker must not approve its own work. |
| **Checker** | The independent persona/sub-agent responsible for *reviewing* code, running linters/tests, and verifying against security and spec requirements. The Checker's pass is required before a feature is considered complete. |
| **Me / Us** | The human developer(s) overseeing the project. Human intervention is requested when the loop fails after 10 iterations. |
| **Users** | Warehouse workers who use the app to scan items and manage stock on their mobile devices. |
| **Owner** | The warehouse owner or manager who views the analytics dashboard and manages user accounts. |

---

## System Terms

| Term | Definition |
|---|---|
| **WMS** | Warehouse Management System — this application. |
| **SKU** | Stock Keeping Unit — a unique identifier for a product in the warehouse. |
| **Barcode** | A machine-readable code (1D or 2D/QR) printed on product packaging. Used to identify items. |
| **Scan** | The act of using the device camera to read a barcode and trigger a WMS action. |
| **Inventory** | The set of all products and their current stock levels tracked in the WMS. |
| **Transaction** | A recorded event that changes stock: either Inbound (received) or Outbound (sold/dispatched). |
| **Inbound / Received** | A transaction type where goods arrive at the warehouse and stock levels increase. |
| **Outbound / Sold** | A transaction type where goods leave the warehouse and stock levels decrease. |
| **Current Stock** | The live count of units of a product currently in the warehouse. |
| **Role** | A permission level assigned to each authenticated user: `user` or `super_admin`. |
| **Super Admin** | A user with full system access: can manage all users, products, and view all analytics. |
| **User (role)** | A warehouse worker with access to scanning, viewing inventory, and logging transactions. |
| **RLS** | Row-Level Security — Supabase/PostgreSQL feature that enforces data access rules at the database level. |
| **PWA** | Progressive Web App — a web app installable on mobile with access to device hardware (camera). |
| **Bootstrap Files** | `AGENT.md`, `GLOSSARY.md`, `STATE.md` — the three initialization documents created before any application code. |
| **STATE.md** | The agent's external memory / progress log. Updated after every development loop iteration. |
| **Development Loop** | The Plan → Maker → Checker → Log cycle that governs every feature's implementation. |
| **Feature Iteration** | One pass through the development loop for a specific feature. Hard-capped at 10 per feature. |
