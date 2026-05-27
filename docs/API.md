# Makerere Sports Management System - API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /auth/register | Register new user | Public |
| POST | /auth/login | Login | Public |
| POST | /auth/refresh | Refresh access token | Public |
| GET | /auth/me | Get current user | Authenticated |
| POST | /auth/logout | Logout | Authenticated |

### Players
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /players | List all players | Authenticated |
| GET | /players/:id | Get player details | Authenticated |
| POST | /players | Create player | Coach/Admin |
| PUT | /players/:id | Update player | Coach/Admin |
| DELETE | /players/:id | Delete player | Coach/Admin |
| GET | /players/search | Search players | Coach/Admin |

### Fixtures
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /fixtures | List fixtures | Authenticated |
| GET | /fixtures/:id | Get fixture | Authenticated |
| POST | /fixtures | Create fixture | Coach/Admin |
| PUT | /fixtures/:id | Update fixture | Coach/Admin |
| DELETE | /fixtures/:id | Delete fixture | Coach/Admin |

### Matches
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /matches | Record match | Coach/Admin |
| GET | /matches/:id | Get match | Authenticated |
| POST | /matches/:id/performances | Add performance | Coach/Admin |

### Ratings
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /ratings/calculate/:player_id | Calculate rating | Coach/Admin |
| GET | /ratings/team/:team_id | Team ratings | Authenticated |
| GET | /ratings/leaderboard | Leaderboard | Authenticated |

### Notifications
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /notifications | My notifications | Authenticated |
| PUT | /notifications/:id/read | Mark read | Authenticated |
| POST | /notifications/send | Send bulk | Coach/Admin |

### Admin
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /admin/users | List users | Admin |
| PUT | /admin/users/:id/toggle | Toggle status | Admin |
| GET | /admin/audit-logs | View logs | Admin |
| GET | /admin/dashboard-stats | Stats | Admin |
