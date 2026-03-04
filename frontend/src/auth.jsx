import { useState } from 'react';
import api from './api';

export default function Auth({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = isLogin
                ? { email, password }
                : { email, password };

            const endpoint = isLogin ? '/auth/token/login/' : '/auth/users/';
            const { data } = await api.post(endpoint, payload);

            if (isLogin) {
                const token = data?.auth_token ?? data?.token ?? data?.key;
                if (!token) {
                    throw new Error('Login succeeded but token was not returned.');
                }
                const resolvedEmail = data?.email ?? email;
                onAuthSuccess({ token, email: resolvedEmail });
                window.location.reload();
            } else {
                alert("Account created! Now login with your credentials.");
                setIsLogin(true);
            }

        } catch (err) {
            const data = err.response?.data;
            const errorMsg =
                data && typeof data === 'object'
                    ? Object.values(data).flat().join(' ')
                    : err.message || 'Authentication failed';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>{isLogin ? 'Login' : 'Register'}</h2>
            <p className="status-text">
                {isLogin ? 'Welcome back. Sign in to view your sensor dashboard.' : 'Create your account to access live sensor readings.'}
            </p>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
                </button>
            </form>
            <button className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
        </div>
    );
}