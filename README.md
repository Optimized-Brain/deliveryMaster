
# deliveryMaster - Delivery Management Platform

deliveryMaster is a modern, full-stack web application designed for efficient delivery management. It provides tools for managing orders and delivery partners. The platform is built with Next.js, React, ShadCN UI, Tailwind CSS, and uses Supabase for its backend database. It also features an AI-powered assistant to suggest optimal partner assignments.

## Overview

deliveryMaster aims to streamline delivery operations by providing a central dashboard for monitoring key metrics, tools for creating and managing orders, registering and organizing delivery partners, and an AI-assisted tool for smart order assignment.

## Features

*   **Dashboard**:
    *   Overview of key metrics: Total Orders, Pending Orders, Delivered Orders, Average Order Value.
    *   Assignment metrics: Total Assignments, Success Rate.
    *   Chart for recent order activity (last 7 days).
    *   List of reported assignment issues (failed pickups/deliveries).
    *   List of top assignment failure reasons.
*   **Order Management**:
    *   Create new orders with customer details, items, delivery address, and value.
    *   View a filterable and sortable table of all orders.
    *   View detailed information for each order.
    *   Update order status (e.g., Mark as Picked Up, Mark as Delivered).
    *   Cancel orders (with confirmation and partner load adjustment).
    *   Report assignment issues (e.g., failed pickup/delivery), which updates the order status and assignment log.
*   **Partner Management**:
    *   Register new delivery partners with contact details, assigned areas, and shift timings.
    *   View a filterable and sortable table of all delivery partners including a summary of their active, delivered, and cancelled orders.
    *   Edit existing partner details.
    *   Delete partners (with confirmation, if not referenced by active orders).
    *   View a detailed summary of assigned orders for each partner via a popover.
*   **Smart Order Assignment**:
    *   AI-powered suggestion for assigning orders to available delivery partners based on location, load, and shift timings.
    *   Users receive a suggestion and can confirm or manually override the partner selection.
*   **Settings**:
    *   Theme switcher (Light, Dark, System mode).
*   **Responsive Design**: Built with Tailwind CSS and ShadCN UI components for a modern and responsive user experience.

## Tech Stack

*   **Frontend**:
    *   Next.js (App Router)
    *   React
    *   TypeScript
    *   ShadCN UI (Component Library)
    *   Tailwind CSS (Styling)
    *   Lucide React (Icons)
    *   Recharts (for charts, via ShadCN UI)
    *   `react-hook-form` & `zod` (Form handling and validation)
    *   `next-themes` (Theme management)
*   **Backend**:
    *   Next.js API Routes
    *   Supabase (PostgreSQL Database, Auth - though auth not explicitly implemented in current iteration)
*   **Artificial Intelligence**:
    *   Google Generative AI (e.g., Gemini) via direct REST API calls for smart assignment suggestions.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

## Environment Variables Setup

Create a `.env` file in the root of your project and add the following environment variables:

```env
# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Google Generative AI API Key (for Smart Assignment Suggestions)
GOOGLE_API_KEY=YOUR_GOOGLE_AI_API_KEY
```

Replace `YOUR_SUPABASE_URL`, `YOUR_SUPABASE_ANON_KEY`, and `YOUR_GOOGLE_AI_API_KEY` with your actual credentials.

**Obtaining Credentials:**
*   **Supabase**: Create a project on [Supabase](https://supabase.com). You can find your Project URL and anon key in your project settings (API section).
*   **Google AI API Key**: Obtain an API key from Google AI Studio (e.g., for Gemini API). Ensure the API key has access to the required generative models.

## Getting Started

1.  **Clone the repository (if applicable) or ensure you have the project files.**
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up your Supabase database:**
    *   Ensure you have the following tables in your Supabase project:
        *   `delivery_partners`: For storing partner information.
            *   Columns: `id` (uuid, primary key), `name` (text), `email` (text), `phone` (text), `status` (text, e.g., 'active', 'inactive', 'on-break'), `areas` (text[]), `shift_start` (time), `shift_end` (time), `current_load` (integer, default 0), `rating` (numeric, default 0), `created_at` (timestamptz, default now()), `completed_orders` (integer, default 0), `cancelled_orders` (integer, default 0).
        *   `orders`: For storing order information.
            *   Columns: `id` (uuid, primary key), `customer_name` (text), `customer_phone` (text, nullable), `items` (jsonb), `status` (text), `area` (text), `customer_address` (text), `assigned_to` (uuid, nullable, foreign key to `delivery_partners.id`), `total_amount` (numeric), `created_at` (timestamptz, default now()).
            *   Ensure a `CHECK` constraint on `orders.status` like: `status = ANY (ARRAY['pending'::text, 'assigned'::text, 'picked'::text, 'delivered'::text, 'cancelled'::text])`.
        *   `assignments`: For logging order assignments.
            *   Columns: `id` (uuid, primary key, default `uuid_generate_v4()`), `order_id` (uuid, foreign key to `orders.id`), `partner_id` (uuid, foreign key to `delivery_partners.id`), `created_at` (timestamptz, default `now()`), `status` (text, NOT NULL, e.g., 'assigned', 'success', 'failed'), `reason` (text, nullable).
            *   Ensure a `CHECK` constraint on `assignments.status` like: `status = ANY (ARRAY['assigned'::text, 'success'::text, 'failed'::text])`.
    *   Set up Row Level Security (RLS) policies as needed, or disable RLS for development if preferred (not recommended for production).
4.  **Ensure your `.env` file is populated with the correct credentials.**
5.  **Restart your development server if it was already running** after updating the `.env` file.

## Running the Application

1.  **Run the Next.js development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:9002` (or another port if specified).

## Database Schema Overview

*   **`delivery_partners`**: Stores information about each delivery partner, including their contact details, operational status, assigned areas, shift timings, current order load, rating, and counts of completed/cancelled orders.
*   **`orders`**: Contains details for each order, such as customer information, items, delivery address, current status (pending, assigned, picked, delivered, cancelled), assigned partner, order value, and creation timestamp.
*   **`assignments`**: Logs each instance of an order being assigned to a partner, including the outcome of the assignment (e.g., assigned, success, failed) and any reasons for failure.

## API Routes Overview

The application uses Next.js API Routes for backend logic:

*   **Partners:**
    *   `GET /api/partners`: Fetches a list of partners (can be filtered by status).
    *   `POST /api/partners`: Creates a new delivery partner.
    *   `PUT /api/partners/[id]`: Updates an existing partner's details.
    *   `DELETE /api/partners/[id]`: Deletes a partner.
*   **Orders:**
    *   `GET /api/orders`: Fetches a list of orders (can be filtered by status or `assignedPartnerId`).
    *   `POST /api/orders`: Creates a new order.
    *   `PUT /api/orders/[id]/status`: Updates the status of an order (and handles related logic like partner load and assignment logging).
*   **Assignments:**
    *   `GET /api/assignments`: Fetches assignment records (currently used to fetch failed assignments).
    *   `POST /api/assignments/report-failure`: Reports an issue with an assignment, updating its status and reason.
    *   `GET /api/assignments/metrics`: Fetches aggregated metrics about assignments (total, success rate, failure reasons).
*   **AI Suggestions:**
    *   `POST /api/ai/suggest-assignment`: Takes order and partner data, calls an external AI service (Google Generative AI) to get a partner suggestion, and returns the suggestion.


## Project Structure

*   `src/app/(app)/`: Contains the main application pages (Dashboard, Orders, Partners, Assignment, Settings).
    *   `layout.tsx`: Defines the layout for the authenticated app section.
    *   `page.tsx` files: Define the content for each route.
*   `src/app/api/`: Houses the backend API route handlers, including AI interaction.
*   `src/components/`: Contains reusable UI components, categorized by feature (e.g., `dashboard`, `orders`, `partners`, `assignment`) and generic UI elements (`ui`, `layout`, `settings`).
*   `src/lib/`:
    *   `constants.ts`: Application-wide constants (navigation links, sample data for areas, status lists).
    *   `supabase.ts`: Initializes the Supabase client.
    *   `types.ts`: TypeScript type definitions.
    *   `utils.ts`: Utility functions (e.g., `cn` for Tailwind class merging).
*   `src/hooks/`: Custom React hooks (e.g., `use-toast`, `use-mobile`).
*   `public/`: Static assets (e.g., `swiftroute-logo.png`).
*   `.env`: Environment variables (Supabase keys, Google AI API Key).

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for bugs, feature requests, or improvements.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (if one is created).
(Consider adding an MIT License file if you intend this to be open source).

