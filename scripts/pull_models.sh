#!/bin/bash
echo "Pulling local LLM models via Ollama..."
ollama pull qwen2.5-vl:7b
ollama pull qwen2.5:7b
echo "Models pulled."
