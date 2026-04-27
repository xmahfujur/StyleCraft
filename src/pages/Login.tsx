import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithPopup,
  linkWithPopup,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ADMIN_EMAILS } from '../constants';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  
  const navigate = useNavigate();

  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleSocialLogin = async () => {
    // 1. CLEAR previous error state
    setPopupBlocked(false);
    
    // 2. PREPARE provider
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      // 3. TRIGGER popup IMMEDIATELY (must be first async call)
      const res = await signInWithPopup(auth, provider);

      // 4. AFTER success, handle logic
      setLoading(true);
      const path = `users/${res.user.uid}`;
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', res.user.uid));
      } catch (err: any) {
        // Use auth object from res if current isn't ready
        const errInfo = {
          error: err.message,
          operationType: 'get',
          path: path,
          authInfo: {
            userId: res.user.uid,
            email: res.user.email,
            isAnonymous: res.user.isAnonymous,
            providerInfo: res.user.providerData.map(p => ({
              providerId: p.providerId,
              email: p.email
            })) || []
          }
        };
        console.error('Firestore Error:', JSON.stringify(errInfo));
        throw new Error(JSON.stringify(errInfo));
      }

      const isAdminEmail = ADMIN_EMAILS.includes(res.user.email || '');
      
      if (!userDoc.exists()) {
        try {
          await setDoc(doc(db, 'users', res.user.uid), {
            uid: res.user.uid,
            name: res.user.displayName || 'User',
            email: res.user.email,
            role: isAdminEmail ? 'admin' : 'user',
            createdAt: new Date().toISOString()
          });
        } catch (err: any) {
          const errInfo = {
            error: err.message,
            operationType: 'write',
            path: path,
            authInfo: {
              userId: res.user.uid,
              email: res.user.email,
              isAnonymous: res.user.isAnonymous,
              providerInfo: res.user.providerData.map(p => ({
                providerId: p.providerId,
                email: p.email
              })) || []
            }
          };
          console.error('Firestore Error:', JSON.stringify(errInfo));
          throw new Error(JSON.stringify(errInfo));
        }
      } else if (userDoc.data()?.role === 'guest' || (isAdminEmail && userDoc.data()?.role !== 'admin')) {
        // Upgrade guest profile or ensure admin role
        try {
          await updateDoc(doc(db, 'users', res.user.uid), {
            name: res.user.displayName || userDoc.data()?.name,
            email: res.user.email,
            role: isAdminEmail ? 'admin' : 'user'
          });
        } catch (err: any) {
          const errInfo = {
            error: err.message,
            operationType: 'write',
            path: path,
            authInfo: {
              userId: res.user.uid,
              email: res.user.email,
              isAnonymous: res.user.isAnonymous,
              providerInfo: res.user.providerData.map(p => ({
                providerId: p.providerId,
                email: p.email
              })) || []
            }
          };
          console.error('Firestore Error:', JSON.stringify(errInfo));
          throw new Error(JSON.stringify(errInfo));
        }
      }
      
      toast.success('Logged in with Google');
      navigate('/');
    } catch (error: any) {
      console.error('Google Auth Error:', error.code, error.message);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized in Firebase. Please add the app URL to Authorized Domains in Firebase Console.', { duration: 10000 });
      } else if (error.code === 'auth/credential-already-in-use') {
        toast.error('This account is already linked to another user.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked. This often happens in iframes.', {
          duration: 10000,
        });
        setPopupBlocked(true);
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.info('Sign-in cancelled');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgotPassword) {
        await sendPasswordResetEmail(auth, email);
        toast.success('Reset email sent');
        setForgotPassword(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back');
        navigate('/');
      } else {
        if (auth.currentUser?.isAnonymous) {
          const credential = EmailAuthProvider.credential(email, password);
          const res = await linkWithCredential(auth.currentUser, credential);
          const isAdminEmail = ADMIN_EMAILS.includes(email);
          await updateDoc(doc(db, 'users', res.user.uid), {
            name,
            email,
            role: isAdminEmail ? 'admin' : 'user'
          });
          toast.success('Account created and linked');
        } else {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          const isAdminEmail = ADMIN_EMAILS.includes(email);
          await setDoc(doc(db, 'users', res.user.uid), {
            uid: res.user.uid,
            name,
            email,
            role: isAdminEmail ? 'admin' : 'user',
            createdAt: new Date().toISOString()
          });
          toast.success('Account created');
        }
        navigate('/');
      }
    } catch (error: any) {
      console.error("Auth Error:", error.code, error.message);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/Password login is not enabled in Firebase Console.');
      } else if (error.code === 'auth/invalid-api-key') {
        toast.error('Firebase API Key is invalid. Please check configuration.');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-40 pb-24 flex items-center justify-center px-4 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-black/10 p-10 shadow-2xl rounded-sm"
      >
        <div className="text-center mb-10">
          <img 
            src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" 
            alt="StyleCraft Logo" 
            className="h-16 w-auto mx-auto mb-6 object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-3xl font-serif mb-2 tracking-widest text-black">
            {forgotPassword ? 'RESET PASSWORD' : (isLogin ? 'LOGIN' : 'SIGN UP')}
          </h1>
          <div className="h-0.5 w-12 bg-black mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && !forgotPassword && (
            <div>
              <label className="block text-[10px] tracking-widest text-black/40 uppercase mb-2 font-bold">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/5 border border-black/10 px-4 py-3 text-sm focus:border-black outline-none transition text-black font-medium"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] tracking-widest text-black/40 uppercase mb-2 font-bold">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/5 border border-black/10 px-4 py-3 text-sm focus:border-black outline-none transition text-black font-medium"
              placeholder="email@example.com"
            />
          </div>
          {!forgotPassword && (
            <div>
              <label className="block text-[10px] tracking-widest text-black/40 uppercase mb-2 font-bold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/5 border border-black/10 px-4 py-3 text-sm focus:border-black outline-none transition text-black font-medium"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 font-bold tracking-[0.2em] hover:bg-black/90 transition disabled:opacity-50 rounded-sm"
          >
            {loading ? 'PROCESSING...' : (forgotPassword ? 'SEND RESET LINK' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'))}
          </button>

          {!forgotPassword && (
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="bg-white px-4 text-black/30">Or continue with</span>
              </div>
            </div>
          )}

          {!forgotPassword && (
            <div className="flex flex-col space-y-4">
              <button
                type="button"
                onClick={() => handleSocialLogin()}
                disabled={loading}
                className="w-full bg-black/5 border border-black/10 text-black py-4 font-bold tracking-[0.2em] hover:bg-black/10 transition flex items-center justify-center space-x-3 rounded-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>GOOGLE</span>
              </button>

              {popupBlocked && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-black text-white py-3 text-center text-[10px] tracking-[0.2em] font-bold hover:bg-black/90 transition rounded-sm"
                >
                  OPEN IN NEW TAB TO LOGIN
                </a>
              )}
            </div>
          )}
        </form>

        <div className="mt-8 text-center space-y-4">
          {!forgotPassword && (
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-[10px] tracking-widest text-black/40 hover:text-black transition block w-full font-bold uppercase"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          )}
          
          <button 
            onClick={() => { setForgotPassword(!forgotPassword); setIsLogin(true); }} 
            className="text-[10px] tracking-widest text-black/40 hover:text-black transition block w-full font-bold uppercase"
          >
            {forgotPassword ? "Back to Login" : "Forgot Password?"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
