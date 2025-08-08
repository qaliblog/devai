# Multi-Provider AI Support

DevAI now supports multiple AI providers including OpenAI, Google Gemini, and Ollama. You can easily switch between providers or use them simultaneously.

## Supported Providers

### 🤖 **Ollama** (Default)
- **Local AI models** - Run on your own hardware
- **Privacy-focused** - No data sent to external services
- **Free to use** - No API costs
- **Offline capable** - Works without internet

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve

# Pull a model
ollama pull deepseek-coder:6.7b
```

### 🔑 **OpenAI**
- **GPT-4, GPT-3.5** - Latest language models
- **High performance** - Fast and reliable
- **API access** - Requires OpenAI API key
- **Cost per token** - Pay for usage

**Setup:**
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add provider in DevAI settings
3. Enter your API key

### 🌐 **Google Gemini**
- **Gemini Pro** - Google's latest AI model
- **Free tier** - Generous free usage
- **Google integration** - Works with Google services
- **API access** - Requires Google AI API key

**Setup:**
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add provider in DevAI settings
3. Enter your API key

## Adding Providers

### Method 1: UI Settings
1. Click the **Settings** icon in the header
2. Click **"Add Provider"**
3. Select your provider type
4. Enter configuration details
5. Click **"Add Provider"**

### Method 2: API
```bash
# Add OpenAI
curl -X POST http://localhost:3000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add-openai",
    "apiKey": "sk-your-openai-key",
    "baseUrl": "https://api.openai.com/v1"
  }'

# Add Gemini
curl -X POST http://localhost:3000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add-gemini",
    "apiKey": "AIza-your-gemini-key",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta"
  }'

# Add Ollama
curl -X POST http://localhost:3000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add-ollama",
    "baseUrl": "http://localhost:11434",
    "model": "deepseek-coder:6.7b"
  }'
```

## Switching Providers

### Method 1: UI Settings
1. Open **Settings**
2. Click on a provider in the list
3. The provider becomes active immediately

### Method 2: API
```bash
# Switch to OpenAI
curl -X POST http://localhost:3000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{
    "action": "switch",
    "provider": "openai"
  }'
```

## Provider Configuration

### OpenAI Configuration
```json
{
  "name": "openai",
  "apiKey": "sk-your-openai-key",
  "baseUrl": "https://api.openai.com/v1",
  "defaultModel": "gpt-4"
}
```

**Available Models:**
- `gpt-4` - Most capable model
- `gpt-4-turbo` - Faster, cheaper
- `gpt-3.5-turbo` - Good balance
- `gpt-3.5-turbo-16k` - Longer context

### Gemini Configuration
```json
{
  "name": "gemini",
  "apiKey": "AIza-your-gemini-key",
  "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
  "defaultModel": "gemini-pro"
}
```

**Available Models:**
- `gemini-pro` - Latest model
- `gemini-pro-vision` - With image support

### Ollama Configuration
```json
{
  "name": "ollama",
  "baseUrl": "http://localhost:11434",
  "defaultModel": "deepseek-coder:6.7b"
}
```

**Recommended Models:**
- `deepseek-coder` - Best for coding
- `codellama:7b` - Fast, good for coding
- `llama2:7b` - General purpose
- `mistral:7b` - Good performance

## Provider Comparison

| Feature | Ollama | OpenAI | Gemini |
|---------|--------|--------|--------|
| **Cost** | Free | Pay per token | Free tier |
| **Privacy** | 100% local | Cloud-based | Cloud-based |
| **Speed** | Depends on hardware | Fast | Fast |
| **Offline** | ✅ Yes | ❌ No | ❌ No |
| **Setup** | Easy | API key | API key |
| **Models** | Many open source | GPT-4, GPT-3.5 | Gemini Pro |

## Usage Examples

### Code Generation
```javascript
// All providers work the same way
const response = await aiProviderManager.generateResponse([
  {
    role: 'system',
    content: 'You are a coding assistant.'
  },
  {
    role: 'user',
    content: 'Write a React component for a todo list.'
  }
]);
```

### Streaming Responses
```javascript
await aiProviderManager.streamResponse(
  messages,
  (chunk) => {
    console.log('Received chunk:', chunk);
  }
);
```

## Environment Variables

You can set default providers using environment variables:

```bash
# .env.local
DEFAULT_AI_PROVIDER=ollama
OPENAI_API_KEY=sk-your-key
GEMINI_API_KEY=AIza-your-key
OLLAMA_BASE_URL=http://localhost:11434
```

## Troubleshooting

### OpenAI Issues
```bash
# Check API key
curl -H "Authorization: Bearer sk-your-key" \
  https://api.openai.com/v1/models

# Test connection
curl -X POST http://localhost:3000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{"action": "test-connection"}'
```

### Gemini Issues
```bash
# Check API key
curl "https://generativelanguage.googleapis.com/v1beta/models?key=AIza-your-key"

# Test connection
curl -X POST http://localhost:3000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{"action": "test-connection"}'
```

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# List available models
ollama list

# Pull a model if needed
ollama pull deepseek-coder:6.7b
```

## Advanced Configuration

### Custom Base URLs
```javascript
// For OpenAI-compatible APIs (like Azure OpenAI)
const openaiProvider = new OpenAIProvider(
  'your-api-key',
  'https://your-endpoint.openai.azure.com/openai/deployments/your-deployment'
);

// For custom Ollama server
const ollamaProvider = new OllamaProvider(
  'http://your-ollama-server:11434',
  'your-model'
);
```

### Model Selection
```javascript
// Use specific model for a request
const response = await aiProviderManager.generateResponse(
  messages,
  { model: 'gpt-4-turbo' }
);
```

## Best Practices

1. **Start with Ollama** - Free and private
2. **Use OpenAI for production** - More reliable
3. **Try Gemini for free tier** - Good performance
4. **Keep API keys secure** - Use environment variables
5. **Monitor usage** - Check API quotas regularly

## Migration Guide

### From Ollama-only to Multi-provider
1. Your existing Ollama setup continues to work
2. Add new providers through settings
3. Switch between providers as needed
4. No code changes required

### From OpenAI to Multi-provider
1. Add your OpenAI configuration
2. Add other providers for fallback
3. Use the same API calls
4. Enjoy more options

## Support

- **Ollama**: [ollama.ai](https://ollama.ai)
- **OpenAI**: [platform.openai.com](https://platform.openai.com)
- **Gemini**: [makersuite.google.com](https://makersuite.google.com)
- **DevAI Issues**: Create an issue on GitHub