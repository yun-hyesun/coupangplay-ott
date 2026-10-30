import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import './scss/Login.scss'

export const Signup = () => {
  const { onEmailSignup, error } = useAuthStore();
  const navigate = useNavigate();

  // 입력값 저장
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // 회원가입
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // 비밀번호 확인
    if (password !== passwordCheck) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setMessage("비밀번호는 6자 이상 입력해 주세요.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const user = await onEmailSignup(email, password);

      if (user) {
        navigate("/profiles");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signup-page">
      <div className="signup-inner">
        <h2>회원가입</h2>
        <p className="login-desc">쿠팡플레이에서 다양한 콘텐츠를 만나보세요.</p>

        <form onSubmit={handleSubmit}>
          <div className="signup-input">
            <label htmlFor="signup-email">이메일</label>
            <input
              id="signup-email"
              type="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="signup-input">
            <label htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="signup-input">
            <label htmlFor="signup-password-check">
              비밀번호 확인
            </label>
            <input
              id="signup-password-check"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={passwordCheck}
              onChange={(e) => setPasswordCheck(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {(message || error) && (
            <p className="signup-error" role="alert">
              {message || "회원가입에 실패했습니다. 입력 정보를 확인해 주세요."}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="signup-bottom">
          <p>이미 계정이 있으신가요?</p>
          <Link to="/login">로그인</Link>
        </div>
      </div>
    </main>
  )
}
