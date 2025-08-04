# Fifteen Puzzle Game - Complete Implementation

## 🎯 Overview
A fully functional Fifteen Puzzle game with complete user authentication, achievement system, and local storage. Built for CSC 4370 Database Systems - Final Project.

## 🚀 Quick Start

### Simple Setup - No Database Required!
1. Download or clone the project files
2. Start a local web server:
   ```bash
   # Using Python (recommended)
   python -m http.server 8080
   
   # Using Node.js
   npx serve
   
   # Using PHP
   php -S localhost:8080
   ```
3. Open your browser and go to: `http://localhost:8080/fifteen.html`
4. Register a new account or play as guest
5. Start solving puzzles and earning achievements!

### 2. Start Playing
1. Open `fifteen.html` in your browser
2. Click "Register" to create an account
3. Or click "Sign In" to login
4. Start playing and earning achievements!

## 📁 File Structure

### Core Game Files
- `fifteen.html` - Main game interface
- `fifteen.css` - Complete styling with green theme
- `fifteen.js` - Game logic and achievement system
- `fifteen.jpg` - Game screenshot/thumbnail

### Authentication System
- `login.html` - User login page
- `register.html` - User registration page
- `fifteen.js` - Complete game logic with authentication

### Resources
- `resources/` - Game assets (backgrounds, audio files)

## 🎮 Features Implemented

### ✅ Core Features
- **User Authentication**: Complete login/register system with localStorage
- **Local Data Storage**: User accounts and preferences saved in browser
- **User Preferences**: Customizable settings and game defaults
- **Game Statistics**: Performance tracking and personal records
- **Achievement System**: 8 different achievements with notifications
- **User Dashboard**: Profile dropdown with statistics and settings

### ✅ Enhanced Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Green Color Theme**: Consistent styling throughout
- **Audio System**: Background music and sound effects
- **Multiple Puzzle Sizes**: 3x3, 4x4, 5x5 support
- **Auto-solver**: A* algorithm implementation
- **Real-time Stats**: Live performance tracking
- **User Profile**: Avatar with dropdown menu and logout functionality

## 🏆 Achievement System

### Available Achievements
| Achievement | Requirement | Icon |
|-------------|-------------|------|
| **First Victory!** | Complete your first puzzle | 🏆 |
| **Speed Demon** | Solve 3x3 in under 30 seconds | ⚡ |
| **Lightning Fast** | Solve 4x4 in under 60 seconds | ⚡ |
| **Efficiency Master** | Solve 4x4 in under 100 moves | 🎯 |
| **Perfectionist** | Solve 3x3 in 22 moves or fewer | 💎 |
| **Puzzle Veteran** | Complete 10 puzzles total | 🎖️ |
| **Puzzle Master** | Complete 50 puzzles total | 👑 |
| **Big Puzzle Solver** | Complete a 5x5 puzzle | 🧩 |

### Testing Achievements
Use `test_achievements.html` to:
- Simulate different game scenarios
- Test achievement unlocking
- View user statistics
- Verify database integration

## 🔧 Configuration

### Database Settings (`config.php`)
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'hkesineni1');
define('DB_USER', 'hkesineni1');
define('DB_PASS', 'hkesineni1');
```

## 🐛 Troubleshooting

### "Unexpected token '<' is not valid JSON"
- **Cause**: Database not set up or API returning HTML error pages
- **Solution**: Run `setup_database.php` first, check MySQL connection

### Login/Register Not Working
- **Cause**: Database tables missing or API errors
- **Solution**: Verify database setup, check browser console for errors

## 📝 Academic Compliance

### Milestone 3 Requirements Met
- ✅ Database integration with MySQL
- ✅ User authentication and session management
- ✅ User preferences and customization
- ✅ Game statistics and performance tracking
- ✅ Achievement system with gamification
- ✅ Admin functionality for system management
- ✅ Proper database design with relationships
- ✅ Security considerations implemented

---

**Ready to play? Start with setting up the database, then enjoy your puzzle-solving journey!** 🧩