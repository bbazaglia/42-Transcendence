# ft_transcendence

A modern web application featuring a classic Pong game. This project is built with a decoupled, containerized architecture, separating the frontend user interface from the backend data service.

## Architecture Overview

The application is managed entirely by Docker Compose, allowing for a seamless one-command setup for any developer.

-   **Frontend**: A Single-Page Application (SPA) built with TypeScript and Tailwind CSS. It handles all visuals, user interaction, and runs the Pong game logic entirely in the browser. It is served by a secure Nginx server configured for HTTPS.

-   **Backend**: A secure and efficient API server built with Node.js and Fastify. Its sole responsibilities are managing user accounts, authentication (JWT), and persisting game data to an SQLite database.

## Tech Stack

-   **Frontend**: TypeScript, Tailwind CSS
-   **Backend**: Node.js, Fastify
-   **Database**: SQLite
-   **Web Server**: Nginx
-   **Containerization**: Docker, Docker Compose

## Features

-   Classic Pong gameplay rendered on the client-side.
-   User registration and login.
-   Secure API with JWT authentication.
-   Match history and user statistics persistence.
-   HTTPS-first configuration with modern security practices.
-   Fully containerized for easy setup and deployment.

## Getting Started

### Prerequisites

-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd ft_transcendence
    ```

2.  **Create the environment file:**
    Copy the example environment file to create your own local configuration.
    ```bash
    cp .env.example .env
    ```
    You can modify the `JWT_SECRET` in the `.env` file to a new random string for better security.

3.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This command will build the Docker images for the frontend and backend services and start the application.

4.  **Access the application:**
    Open your web browser and navigate to:
    **`https://localhost:8443`**

    > **Note:** You will see a browser warning about an insecure connection. This is expected because the application uses a self-signed SSL certificate for local development. You can safely proceed to the site.

## Environment Variables

The following environment variables are used by the backend service and are configured in the `.env` file:

-   `JWT_SECRET`: A secret key used for signing and verifying JSON Web Tokens.
-   `DATABASE_PATH`: The path inside the container where the SQLite database file is stored. Defaults to `/app/data/database.sqlite`.

## Project Structure

```
.
├── backend/
│   ├── src/
│   ├── Dockerfile      # Production-ready Dockerfile for the backend
│   └── package.json
├── frontend/
│   ├── src/
│   ├── Dockerfile      # Multi-stage Dockerfile for the frontend
│   ├── nginx.conf      # Nginx configuration with HTTPS and security headers
│   └── package.json
├── .env.example        # Example environment variables
├── docker-compose.yml  # Docker Compose file to orchestrate services
└── README.md           # You are here
```