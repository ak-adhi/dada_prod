# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies required for compiling native packages (like faiss-cpu)
# These tools are essential for dependencies with C/C++ extensions.
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED 1

# 1. Copy and install dependencies first
# This ensures a faster build if only application code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# The ENTRYPOINT or CMD is defined in docker-compose.yml
