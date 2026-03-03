import { useEffect, useMemo, useState } from 'react'
import { Thermometer, Droplets, Clock3 } from 'lucide-react'
import './App.css'
import api from './api'
import Auth from './auth'

const API_URL = '/api/readings/'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem('authToken')),
  )
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem('userEmail')
    return email ? { email } : null
  })
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      setReadings([])
      setError('')
      setLoading(false)
      return
    }

    const fetchReadings = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await api.get(API_URL)

        const data = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
            ? response.data.results
            : []

        setReadings(data)
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('userEmail')
          setIsAuthenticated(false)
          setUser(null)
          return
        }
        setError('Failed to load sensor data.')
      } finally {
        setLoading(false)
      }
    }

    fetchReadings()
  }, [isAuthenticated])

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

  return (
    <main className="dashboard">
      <header className="topbar">
        <h1>Sensor Readings</h1>
        <div className="user-actions">
          <span>{user?.email}</span>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && readings.length === 0 && (
        <p>No sensor data available.</p>
      )}

      {!loading && !error && (
        <section className="grid">
          {readings.map((item, index) => {
            const timestamp = item.timestamp ?? item.created_at ?? item.time
            const temperature = item.temperature ?? item.temp ?? '--'
            const humidity = item.humidity ?? '--'

            return (
              <article className="card" key={item.id ?? index}>
                <div className="row">
                  <Thermometer size={18} />
                  <span>Temperature: {temperature}°C</span>
                </div>
                <div className="row">
                  <Droplets size={18} />
                  <span>Humidity: {humidity}%</span>
                </div>
                <div className="row">
                  <Clock3 size={18} />
                  <span>
                    Timestamp:{' '}
                    {timestamp ? formatter.format(new Date(timestamp)) : '--'}
                  </span>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default App
