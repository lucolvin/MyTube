# MyTube 🎬

A full-featured, self-hosted YouTube clone for your personal media collection. Built as a Docker stack for easy deployment.

![MyTube Screenshot](docs/screenshot.png)

## Features

### Core Features
- 📁 **Folder-based Channels**: Top-level folders automatically become channels
- 🎥 **Video Streaming**: Stream videos with seek support
- 🔍 **Full-text Search**: Search videos and channels
- 📱 **Responsive Design**: Works on desktop and mobile
- 🖼️ **Auto Thumbnails**: Automatically generates video thumbnails

### YouTube-like Features
- 👍 **Like/Dislike**: React to videos
- 💬 **Comments**: Comment on videos with replies
- 📋 **Playlists**: Create and manage playlists
- ⏰ **Watch Later**: Save videos for later
- 📺 **Subscriptions**: Subscribe to channels
- 📜 **Watch History**: Resume where you left off
- ⏩ **Speed Control**: Hold spacebar or left-click to speed up playback (2x)

### User Features
- 🔐 **Authentication**: User registration and login
- 👤 **User Profiles**: Personalized experience
- 📊 **View Counts**: Track video popularity

## Quick Start

### Prerequisites
- Docker and Docker Compose
- A folder with video files (mp4, mkv, avi, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lucolvin/mytube.git
   cd mytube
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your media path:
   ```env
   MEDIA_PATH=/path/to/your/videos
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access MyTube**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

### Media Folder Structure

MyTube uses your folder structure to organize content:

```
/your/media/folder/
├── Channel One/           # Becomes "Channel One" channel
│   ├── video1.mp4
│   ├── video2.mkv
│   └── Subfolder/         # Videos here also belong to "Channel One"
│       └── video3.avi
├── Channel Two/           # Becomes "Channel Two" channel
│   └── tutorial.mp4
└── random-video.mp4       # Goes to "Uncategorized" channel
```

**Key Points:**
- Top-level folders become **channels**
- Videos in subfolders belong to their parent channel
- Videos in the root go to "Uncategorized"
- Supported formats: mp4, mkv, avi, mov, wmv, flv, webm, m4v, mpeg, mpg, 3gp

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEDIA_PATH` | Path to your media folder | `./media` |
| `DB_USER` | PostgreSQL username | `mytube` |
| `DB_PASSWORD` | PostgreSQL password | `mytube_password` |
| `DB_NAME` | PostgreSQL database name | `mytube` |
| `JWT_SECRET` | Secret for JWT tokens | (change this!) |
| `REACT_APP_API_URL` | API URL for frontend | `http://localhost:3001` |

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React web application |
| `backend` | 3001 | Node.js API server |
| `db` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache |
| `nginx` | 80/443 | Reverse proxy (production) |

## Usage

### Video Playback Controls

- **Space** (tap): Play/Pause
- **Space** (hold): 2x speed while held
- **Left Click** (tap): Play/Pause
- **Left Click** (hold): 2x speed while held

### Rescanning Media

If you add new videos to your media folder:

1. Login as admin
2. The system automatically scans on startup
3. Or trigger a manual scan via API:
   ```bash
   curl -X POST http://localhost:3001/api/scan \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Default Admin Account

- **Username**: admin
- **Password**: admin123 (change this immediately!)

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Running Tests
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Frontend   │     │   Redis     │
│  (Reverse   │     │   (React)   │     │   (Cache)   │
│   Proxy)    │     └─────────────┘     └─────────────┘
└─────────────┘              │                  │
       │                     │                  │
       ▼                     ▼                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │────▶│ PostgreSQL  │     │    Media    │
│  (Node.js)  │     │     (DB)    │     │   Volume    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## API Endpoints

### Videos
- `GET /api/videos` - List all videos
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/stream` - Stream video
- `POST /api/videos/:id/react` - Like/dislike video

### Channels
- `GET /api/channels` - List all channels
- `GET /api/channels/:id` - Get channel details
- `GET /api/channels/:id/videos` - Get channel videos
- `POST /api/channels/:id/subscribe` - Subscribe to channel

### Search
- `GET /api/search?q=query` - Search videos and channels

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

## Production Deployment

### Using Nginx Reverse Proxy

1. Enable the nginx service in docker-compose:
   ```bash
   docker-compose --profile production up -d
   ```

2. Configure SSL certificates in `nginx/ssl/`

3. Update `nginx/nginx.conf` with your domain

### Security Recommendations

1. **Change default passwords** in `.env`
2. **Use HTTPS** in production
3. **Set a strong JWT_SECRET**
4. **Limit access** to admin endpoints
5. **Regular backups** of PostgreSQL data

## Troubleshooting

### Videos not appearing
- Check that `MEDIA_PATH` is correctly set
- Ensure video files have supported extensions
- Check backend logs: `docker-compose logs backend`

### Thumbnails not generating
- FFmpeg is required (included in Docker image)
- Check video file is not corrupted
- Check thumbnail directory permissions

### Database connection issues
- Wait for PostgreSQL to fully start
- Check database credentials in `.env`
- Verify database container is running

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Inspired by YouTube's UI/UX
- Built with React, Node.js, PostgreSQL
- Uses FFmpeg for video processing
