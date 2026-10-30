import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import './scss/Login.scss'

export const Login = () => {
  const { onEmailLogin, onGoogleLogin, error } = useAuthStore();
  const navigate = useNavigate();

  // 입력값 저장
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이메일 로그인
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const user = await onEmailLogin(email, password);
      if (user) {
        navigate("/profiles");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 구글 로그인
  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const user = await onGoogleLogin();
      if (user) {
        navigate("/profiles");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-inner">
        <h2>로그인</h2>
        <p className="login-desc">쿠팡플레이 계정으로 로그인해 주세요.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-input">
            <label htmlFor="login-email">이메일</label>
            <input
              id="login-email"
              type="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-input">
            <label htmlFor="login-password">비밀번호</label>
            <input
              id="login-password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="login-divider">
          <span>또는</span>
        </div>

        <button
          type="button"
          className="google-login"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          Google로 로그인
        </button>

        <div className="login-bottom">
          <p>아직 계정이 없으신가요?</p>
          <Link to="/signup">회원가입</Link>
        </div>
      </div>
    </main>
  )
}
