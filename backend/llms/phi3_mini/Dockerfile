# Use llama.cpp full image (ARM-compatible)
FROM ghcr.io/ggerganov/llama.cpp:full

# Expose port
EXPOSE 8081

# CMD to run the Llama.cpp server with GPU offloading
# -s: Starts the server mode
# -m: Specifies the model file path within the container (from the volume mount)
# -c 2048: Sets the context window size
# -ngl -1: Instructs Llama.cpp to offload ALL possible layers to the GPU
CMD ["-s", "-m", "/model/Phi-3-mini-4k-instruct-Q4_K_M.gguf", "--host", "0.0.0.0", "--port", "8081", "-c", "2048", "-ngl", "-1"]
