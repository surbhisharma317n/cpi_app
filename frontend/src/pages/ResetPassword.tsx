import { useNavigate } from "react-router-dom";
import ResetPasswordForm from "../components/auth/ResetPasswordForm";
import NSSLogo from "../assets/img/mospi_new_lgo.png";

export default function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Left Sidebar */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden min-h-full"
        style={{
          background: 'linear-gradient(180deg, var(--rail) 0%, var(--rail-2) 100%)'
        }}
      >
        {/* Background decorative elements */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          style={{ backgroundColor: 'var(--tri-saffron)' }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          style={{ backgroundColor: 'var(--tri-green)' }}
        ></div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <div
              className="inline-flex items-center justify-center rounded-2xl p-0"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
                width: '128px',
                height: '128px',
              }}
            >
              <img
                src={NSSLogo}
                alt="MoSPI Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div>
            <h1
              className="font-bold mb-4"
              style={{
                fontSize: '29px',
                lineHeight: '1',
                letterSpacing: '-.02em',
                color: '#FFFFFF',
              }}
            >
              Consumer Price Index
            </h1>
            <h2
              className="font-bold mb-8"
              style={{
                fontSize: '29px',
                lineHeight: '.6',
                letterSpacing: '-.02em',
                color: '#FFFFFF',
              }}
            >
              Compilation Suite
            </h2>
            <p
              className="leading-relaxed mb-8"
              style={{
                fontSize: '14.5px',
                color: '#B7C6DA',
                lineHeight: '1.6',
              }}
            >
              Secure workspace for compiling, reviewing and releasing India's official Consumer Price Index. Access is restricted to authorised MoSPI officials.
            </p>

            {/* Features */}
            <div className="space-y-5">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-6 h-6 flex-shrink-0 mt-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--tri-saffron)' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div>
                  <p
                    style={{
                      fontSize: '14.5px',
                      color: '#B7C6DA',
                      lineHeight: '.6',
                    }}
                  >
                    Multi-factor sign-in with a one-time passcode (OTP)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <svg
                  className="w-6 h-6 flex-shrink-0 mt-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--tri-saffron)' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div>
                  <p
                    style={{
                      fontSize: '14.5px',
                      color: '#B7C6DA',
                      lineHeight: '.6',
                    }}
                  >
                    WCAG 2.2 AA Accessible · screen-reader & keyboard ready
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <svg
                  className="w-6 h-6 flex-shrink-0 mt-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--tri-saffron)' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div>
                  <p
                    style={{
                      fontSize: '14.5px',
                      color: '#B7C6DA',
                      lineHeight: '.6',
                    }}
                  >
                    Role-based access for Compilers, Reviewers & Admins
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="relative z-10"
          style={{
            fontSize: '14px',
            color: 'var(--rail-text-dim)',
          }}
        >
          <p style={{ marginBottom: '12px' }}>© 2026 Ministry of Statistics & Programme Implementation, Government of India.</p>
          <div className="flex space-x-2" style={{ fontSize: '14px' }}>
            <a href="#" className="hover:opacity-80 transition" style={{ color: 'var(--rail-text-dim)' }}>
              Privacy Policy
            </a>
            <span>·</span>
            <a href="#" className="hover:opacity-80 transition" style={{ color: 'var(--rail-text-dim)' }}>
              Terms of Use
            </a>
            <span>·</span>
            <a href="#" className="hover:opacity-80 transition" style={{ color: 'var(--rail-text-dim)' }}>
              Accessibility Statement
            </a>
            <span>·</span>
            <a href="#" className="hover:opacity-80 transition" style={{ color: 'var(--rail-text-dim)' }}>
              Grievance Redressal
            </a>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Password Form */}
      <div
        className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 min-h-full overflow-y-auto"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="w-full max-w-lg">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
