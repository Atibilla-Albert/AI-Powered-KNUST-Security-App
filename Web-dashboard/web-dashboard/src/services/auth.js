// // src/services/auth.js
// import { Auth } from 'aws-amplify';

// export const authService = {
//   /**
//    * Sign in a user
//    * @param {string} username
//    * @param {string} password
//    * @returns {Promise<Object>}
//    */
//   async signIn(username, password) {
//     try {
//       const user = await Auth.signIn(username, password);
//       return user;
//     } catch (error) {
//       console.error('Error signing in:', error);
//       throw error;
//     }
//   },

//   /**
//    * Sign out the user
//    * @returns {Promise<void>}
//    */
//   async signOut() {
//     try {
//       await Auth.signOut();
//     } catch (error) {
//       console.error('Error signing out:', error);
//       throw error;
//     }
//   },

//   /**
//    * Register a new user
//    */
//   async signUp(username, password, email, additionalAttributes = {}) {
//     try {
//       const result = await Auth.signUp({
//         username,
//         password,
//         attributes: {
//           email,
//           ...additionalAttributes
//         }
//       });
//       return result;
//     } catch (error) {
//       console.error('Error signing up:', error);
//       throw error;
//     }
//   },

//   /**
//    * Confirm sign up with code
//    */
//   async confirmSignUp(username, code) {
//     try {
//       await Auth.confirmSignUp(username, code);
//     } catch (error) {
//       console.error('Error confirming sign up:', error);
//       throw error;
//     }
//   },

//   /**
//    * Forgot password
//    */
//   async forgotPassword(username) {
//     try {
//       await Auth.forgotPassword(username);
//     } catch (error) {
//       console.error('Error initiating password reset:', error);
//       throw error;
//     }
//   },

//   /**
//    * Confirm password reset
//    */
//   async confirmForgotPassword(username, code, newPassword) {
//     try {
//       await Auth.forgotPasswordSubmit(username, code, newPassword);
//     } catch (error) {
//       console.error('Error confirming password reset:', error);
//       throw error;
//     }
//   },

//   /**
//    * Get current authenticated user
//    */
//   async getCurrentAuthenticatedUser() {
//     try {
//       const user = await Auth.currentAuthenticatedUser();
//       return user;
//     } catch (error) {
//       console.log('No authenticated user');
//       throw error;
//     }
//   },

//   /**
//    * Get current session (e.g., JWT)
//    */
//   async getCurrentSession() {
//     try {
//       return await Auth.currentSession();
//     } catch (error) {
//       console.error('No current session');
//       throw error;
//     }
//   },

//   /**
//    * Check if authenticated
//    */
//   async isAuthenticated() {
//     try {
//       await Auth.currentAuthenticatedUser();
//       return true;
//     } catch {
//       return false;
//     }
//   }
// };

// export default authService;

// src/services/auth.js (mock version for UI testing)

export const authService = {
  async signIn(username, password) {
    return {
      username,
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['Administrators']
          }
        }
      }
    };
  },

  async signOut() {
    return Promise.resolve();
  },

  async getCurrentAuthenticatedUser() {
    return {
      username: 'mockUser',
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['Administrators']
          }
        }
      }
    };
  },

  async signUp() {
    return Promise.resolve();
  },

  async confirmSignUp() {
    return Promise.resolve();
  },

  async forgotPassword() {
    return Promise.resolve();
  },

  async confirmForgotPassword() {
    return Promise.resolve();
  }
};

