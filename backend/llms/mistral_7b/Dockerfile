# Use llama.cpp full image (ARM-compatible)
FROM ghcr.io/ggerganov/llama.cpp:full

# Expose port
EXPOSE 8080

# CMD to run the server on ARM
CMD ["-s", "-m", "/model/mistral-7b-instruct-v0.2.Q4_K_M.gguf", "--host", "0.0.0.0", "--port", "8080", "-c", "2048", "-ngl", "-1"]
