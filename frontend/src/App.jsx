import { useEffect, useMemo, useState } from 'react'
import { MapPin, ShieldCheck } from 'lucide-react'
import './App.css'
import api from './api'
import Auth from './auth'

const NODES_API_URL = '/api/nodes/'
const READINGS_API_URL = '/api/readings/'
const USERS_API_URL = '/api/users/'

function TrendChart({ title, color, unit, readings, valueKey }) {
  const sortedReadings = [...readings]
    .filter((item) => item.timestamp && typeof item[valueKey] === 'number')
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  if (sortedReadings.length < 2) {
    return (
      <article className="chart-card">
        <h3>{title}</h3>
        <p className="hint-text">Need at least 2 readings to plot graph.</p>
      </article>
    )
  }

  const width = 620
  const height = 220
  const padding = 24
  const values = sortedReadings.map((item) => item[valueKey])
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1

  const points = sortedReadings.map((item, index) => {
    const x =
      padding +
      (index / (sortedReadings.length - 1)) * (width - padding * 2)
    const y =
      height -
      padding -
      ((item[valueKey] - minValue) / valueRange) * (height - padding * 2)
    return { x, y, value: item[valueKey], timestamp: item.timestamp }
  })

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img">
        <path d={pathData} fill="none" stroke={color} strokeWidth="3" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3" fill={color} />
        ))}
      </svg>
      <p className="hint-text">
        Min {minValue.toFixed(1)}{unit} · Max {maxValue.toFixed(1)}{unit}
      </p>
    </article>
  )
}

function SyncStatus({ lastSyncedAt, hasError }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!lastSyncedAt) {
      setElapsedSeconds(0)
      return
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000)))
    }

    updateElapsed()
    const timer = setInterval(updateElapsed, 1000)
    return () => clearInterval(timer)
  }, [lastSyncedAt])

  if (hasError) {
    return null
  }

  if (!lastSyncedAt) {
    return <p className="sync-text">Waiting for first sync...</p>
  }

  if (elapsedSeconds <= 1) {
    return <p className="sync-text">Last synced: just now</p>
  }

  return <p className="sync-text">Last synced: {elapsedSeconds}s ago</p>
}

function App() {
  const TEMPERATURE_HIGH_THRESHOLD = 30
  const HUMIDITY_HIGH_THRESHOLD = 70
  const POLLUTION_HIGH_THRESHOLD = 400

  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem('authToken')),
  )
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem('userEmail')
    return email ? { email } : null
  })
  const [readings, setReadings] = useState([])
  const [nodes, setNodes] = useState([])
  const [users, setUsers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [activeView, setActiveView] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [submittingGrant, setSubmittingGrant] = useState(false)
  const [error, setError] = useState('')
  const [grantMessage, setGrantMessage] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setReadings([])
      setNodes([])
      setUsers([])
      setCurrentUserId(null)
      setError('')
      setGrantMessage('')
      setLoading(false)
      return
    }

    const loadDashboardMeta = async () => {
      try {
        setLoading(true)
        setError('')
        const [profileRes, nodesRes, usersRes] = await Promise.all([
          api.get('/auth/users/me/'),
          api.get(NODES_API_URL),
          api.get(USERS_API_URL),
        ])

        const nodeData = Array.isArray(nodesRes.data)
          ? nodesRes.data
          : Array.isArray(nodesRes.data?.results)
            ? nodesRes.data.results
            : []

        const userData = Array.isArray(usersRes.data)
          ? usersRes.data
          : Array.isArray(usersRes.data?.results)
            ? usersRes.data.results
            : []

        setCurrentUserId(profileRes.data?.id ?? null)
        setNodes(nodeData)
        setUsers(userData)

        const availableLocations = [...new Set(nodeData.map((node) => node.location).filter(Boolean))]
        if (availableLocations.length > 0) {
          setSelectedLocation((prev) => (availableLocations.includes(prev) ? prev : availableLocations[0]))
        }
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('userEmail')
          setIsAuthenticated(false)
          setUser(null)
          return
        }
        setError('Failed to load dashboard metadata.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardMeta()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !selectedLocation) {
      setReadings([])
      return
    }

    let pollTimer

    const fetchReadings = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true)
          setError('')
        }

        const response = await api.get(READINGS_API_URL, {
          params: { location: selectedLocation },
        })

        const data = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
            ? response.data.results
            : []

        setReadings(data)
        setLastSyncedAt(Date.now())
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('userEmail')
          setIsAuthenticated(false)
          setUser(null)
          return
        }
        if (!silent) {
          setError('Failed to load sensor data for selected location.')
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    }

    fetchReadings({ silent: false })

    pollTimer = setInterval(() => {
      fetchReadings({ silent: true })
    }, 10000)

    return () => {
      clearInterval(pollTimer)
    }
  }, [isAuthenticated, selectedLocation])

  const ownerNodes = useMemo(
    () => nodes.filter((node) => currentUserId && node.owner === currentUserId),
    [nodes, currentUserId],
  )

  useEffect(() => {
    if (ownerNodes.length > 0) {
      setSelectedNodeId((prev) =>
        ownerNodes.some((node) => String(node.id) === prev) ? prev : String(ownerNodes[0].id),
      )
    } else {
      setSelectedNodeId('')
    }
  }, [ownerNodes])

  useEffect(() => {
    if (users.length > 0) {
      setSelectedUserId((prev) =>
        users.some((option) => String(option.id) === prev) ? prev : String(users[0].id),
      )
    } else {
      setSelectedUserId('')
    }
  }, [users])

  const locationOptions = useMemo(
    () => [...new Set(nodes.map((node) => node.location).filter(Boolean))],
    [nodes],
  )

  const userEmailById = useMemo(() => {
    const map = new Map()
    if (currentUserId && user?.email) {
      map.set(currentUserId, user.email)
    }
    users.forEach((item) => {
      map.set(item.id, item.email)
    })
    return map
  }, [users, currentUserId, user])

  const sharedAccessNotice = useMemo(() => {
    if (!selectedLocation || !currentUserId) return ''

    const nodeForLocation = nodes.find(
      (node) =>
        node.location === selectedLocation &&
        node.owner !== currentUserId &&
        node.access_entries?.some((entry) => entry.user === currentUserId),
    )

    if (!nodeForLocation) return ''

    const accessEntry = nodeForLocation.access_entries.find((entry) => entry.user === currentUserId)
    if (!accessEntry) return ''

    const ownerEmail = userEmailById.get(nodeForLocation.owner) || `User #${nodeForLocation.owner}`
    const grantedByEmail = accessEntry.granted_by
      ? userEmailById.get(accessEntry.granted_by) || ownerEmail
      : ownerEmail

    return `You were given ${accessEntry.role} access by ${grantedByEmail}.`
  }, [nodes, selectedLocation, currentUserId, userEmailById])

  const handleGrantAccess = async (event) => {
    event.preventDefault()
    if (!selectedNodeId || !selectedUserId) return

    try {
      setSubmittingGrant(true)
      setGrantMessage('')
      await api.post(`/api/nodes/${selectedNodeId}/grant-access/`, {
        user: Number(selectedUserId),
        role: selectedRole,
      })

      const nodesRes = await api.get(NODES_API_URL)
      const nodeData = Array.isArray(nodesRes.data)
        ? nodesRes.data
        : Array.isArray(nodesRes.data?.results)
          ? nodesRes.data.results
          : []

      setNodes(nodeData)
      setGrantMessage('Access updated successfully.')
    } catch {
      setGrantMessage('Failed to update access.')
    } finally {
      setSubmittingGrant(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    setIsAuthenticated(false)
    setUser(null)
  }

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  )

  if (!isAuthenticated) {
    return <Auth setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
  }

  const selectedNode = ownerNodes.find((node) => String(node.id) === selectedNodeId)
  const latestReading = readings.length > 0 ? readings[0] : null
  const latestTemperature = Number(latestReading?.temperature)
  const latestHumidity = Number(latestReading?.humidity)
  const latestPollution = Number(latestReading?.pollution)
  const isTempHigh = Number.isFinite(latestTemperature) && latestTemperature >= TEMPERATURE_HIGH_THRESHOLD
  const isHumidityHigh = Number.isFinite(latestHumidity) && latestHumidity >= HUMIDITY_HIGH_THRESHOLD
  const isPollutionHigh = Number.isFinite(latestPollution) && latestPollution >= POLLUTION_HIGH_THRESHOLD
  const latestTimestamp = latestReading?.timestamp ?? latestReading?.created_at ?? latestReading?.time

  const dailyAverages = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dateLabelFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

    const getAverage = (items, key) => {
      const values = items
        .map((entry) => Number(entry[key]))
        .filter((value) => Number.isFinite(value))

      if (values.length === 0) {
        return null
      }

      return values.reduce((sum, value) => sum + value, 0) / values.length
    }

    return Array.from({ length: 5 }, (_, index) => {
      const dayOffset = index + 1
      const dayStart = new Date(startOfToday)
      dayStart.setDate(startOfToday.getDate() - dayOffset)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)

      const dayReadings = readings.filter((item) => {
        const timestamp = item.timestamp ?? item.created_at ?? item.time
        if (!timestamp) {
          return false
        }

        const readingTime = new Date(timestamp).getTime()
        return Number.isFinite(readingTime) && readingTime >= dayStart.getTime() && readingTime < dayEnd.getTime()
      })

      return {
        label: dayOffset === 1 ? `Yesterday (${dateLabelFormatter.format(dayStart)})` : dateLabelFormatter.format(dayStart),
        temperature: getAverage(dayReadings, 'temperature'),
        humidity: getAverage(dayReadings, 'humidity'),
        pollution: getAverage(dayReadings, 'pollution'),
        hasData: dayReadings.length > 0,
      }
    })
  }, [readings])

  return (
    <main className="dashboard">
      <header className="topbar">
        <h1>AtmoNode Dashboard</h1>
        <div className="user-actions">
          <span>{user?.email}</span>
          {ownerNodes.length > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setActiveView((prev) => (prev === 'grant' ? 'dashboard' : 'grant'))}
            >
              {activeView === 'grant' ? 'Back to Dashboard' : 'Grant Access'}
            </button>
          )}
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      <SyncStatus lastSyncedAt={lastSyncedAt} hasError={Boolean(error)} />

      {!loading && !error && selectedLocation && latestReading && (
        <section className="latest-grid">
          <article className={`latest-card ${isTempHigh ? 'latest-temp-high' : 'latest-temp-low'}`}>
            <div className="latest-header">
              <h3>Latest Temperature</h3>
            </div>
            <p className="latest-value">{Number.isFinite(latestTemperature) ? `${latestTemperature.toFixed(1)}°C` : '--'}</p>
            <p className="latest-state">{isTempHigh ? 'High temperature' : 'Normal temperature'}</p>
          </article>

          <article className={`latest-card ${isHumidityHigh ? 'latest-humidity-high' : 'latest-humidity-low'}`}>
            <div className="latest-header">
              <h3>Latest Humidity</h3>
            </div>
            <p className="latest-value">{Number.isFinite(latestHumidity) ? `${latestHumidity.toFixed(1)}%` : '--'}</p>
            <p className="latest-state">{isHumidityHigh ? 'High humidity' : 'Normal humidity'}</p>
          </article>

          <article className={`latest-card ${isPollutionHigh ? 'latest-pollution-high' : 'latest-pollution-low'}`}>
            <div className="latest-header">
              <h3>Latest Pollution</h3>
            </div>
            <p className="latest-value">{Number.isFinite(latestPollution) ? `${latestPollution.toFixed(1)} ppm` : '--'}</p>
            <p className="latest-state">{isPollutionHigh ? 'High pollution' : 'Normal pollution'}</p>
          </article>
        </section>
      )}

      {!loading && !error && selectedLocation && latestTimestamp && (
        <p className="hint-text latest-time">Updated: {formatter.format(new Date(latestTimestamp))}</p>
      )}

      {!loading && !error && activeView === 'dashboard' && sharedAccessNotice && (
        <p className="access-notice">{sharedAccessNotice}</p>
      )}

      {!loading && !error && activeView === 'dashboard' && (
        <section className="controls-grid">
          <article className="panel location-panel">
            <div className="panel-title">
              <MapPin size={18} />
              <h2>Choose Location</h2>
            </div>
            <label htmlFor="location-select">Node location</label>
            <select
              id="location-select"
              value={selectedLocation}
              onChange={(event) => setSelectedLocation(event.target.value)}
            >
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {locationOptions.length === 0 && (
              <p className="hint-text">No node location found yet.</p>
            )}
          </article>
        </section>
      )}

      {!loading && !error && activeView === 'grant' && ownerNodes.length > 0 && (
        <section className="grant-page">
          <article className="panel grant-panel">
            <div className="panel-title">
              <ShieldCheck size={18} />
              <h2>Share Node Access</h2>
            </div>
            <form onSubmit={handleGrantAccess} className="share-form">
              <label htmlFor="node-select">Your node</label>
              <select
                id="node-select"
                value={selectedNodeId}
                onChange={(event) => setSelectedNodeId(event.target.value)}
              >
                {ownerNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>

              <label htmlFor="user-select">User</label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={users.length === 0}
              >
                {users.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.email}
                  </option>
                ))}
              </select>

              <label htmlFor="role-select">Role</label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
              >
                <option value="owner">owner</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>

              <button
                type="submit"
                disabled={!selectedNodeId || !selectedUserId || submittingGrant}
              >
                {submittingGrant ? 'Updating...' : 'Grant Access'}
              </button>
            </form>
            {grantMessage && <p className="hint-text">{grantMessage}</p>}
            {selectedNode?.access_entries?.length > 0 && (
              <p className="hint-text">
                Shared with: {selectedNode.access_entries.map((entry) => `${entry.user} (${entry.role})`).join(', ')}
              </p>
            )}
          </article>
        </section>
      )}

      {!loading && !error && activeView === 'dashboard' && selectedLocation && (
        <section className="charts-grid">
          <TrendChart
            title={`Temperature vs Time (${selectedLocation})`}
            color="#7c3aed"
            unit="°C"
            readings={readings}
            valueKey="temperature"
          />
          <TrendChart
            title={`Humidity vs Time (${selectedLocation})`}
            color="#0891b2"
            unit="%"
            readings={readings}
            valueKey="humidity"
          />
          <TrendChart
            title={`Pollution vs Time (${selectedLocation})`}
            color="#4c1d95"
            unit=" ppm"
            readings={readings}
            valueKey="pollution"
          />
        </section>
      )}

      {!loading && !error && activeView === 'dashboard' && selectedLocation && (
        <section className="grid">
          {dailyAverages.map((day, index) => (
            <article className="card" key={index}>
              <h3>{day.label}</h3>
              <div className="row">
                <span>Avg Temperature: {Number.isFinite(day.temperature) ? `${day.temperature.toFixed(1)}°C` : '--'}</span>
              </div>
              <div className="row">
                <span>Avg Humidity: {Number.isFinite(day.humidity) ? `${day.humidity.toFixed(1)}%` : '--'}</span>
              </div>
              <div className="row">
                <span>Avg Pollution: {Number.isFinite(day.pollution) ? `${day.pollution.toFixed(1)} ppm` : '--'}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && !error && activeView === 'dashboard' && selectedLocation && !dailyAverages.some((day) => day.hasData) && (
        <p>No sensor data available for this location.</p>
      )}
    </main>
  )
}

export default App
