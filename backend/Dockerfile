# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory inside the container
# All subsequent commands will be executed from this directory
WORKDIR /app

# Set environment variables for non-interactive commands and Python
ENV PYTHONUNBUFFERED 1

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies. Use no-cache-dir to keep the image small.
# Use --break-system-packages for non-venv installations in modern Python environments
RUN pip install --no-cache-dir -r requirements.txt

# We don't copy the whole code base here because the 'volumes' mount
# in docker-compose.yml will inject the code at runtime.

# The ENTRYPOINT or CMD is defined in docker-compose.yml

# The container exposes port 8000, which is where Uvicorn will run the FastAPI app.
# Note: This is documentation; the actual port mapping is done in docker-compose.yml.
EXPOSE 8000

# NOTE: No CMD is needed here. The startup command is defined explicitly 
# in the 'command' field for both the 'api' and 'worker' services in docker-compose.yml.
