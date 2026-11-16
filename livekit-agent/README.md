# LiveKit agent deployment

This directory is deployed separately from the Next.js application.

## Deploy to LiveKit Cloud

Install the LiveKit CLI, authenticate it, then run these commands from this
directory:

```bash
lk cloud auth
lk agent create --region <region> --secrets-file secrets.env
```

For later updates:

```bash
lk agent deploy --secrets-file secrets.env
```

Create `secrets.env` locally with the LiveKit project credentials:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

The file is ignored and must never be committed. LiveKit Cloud injects these
values at runtime; the Docker image does not contain them.
