// // components/UserProfile.tsx
// import { useSelector } from 'react-redux';
// import { selectCurrentUser } from '../../features/auth/authSlice';


// export const UserProfile = () => {
//   const user = useSelector(selectCurrentUser);

//   if (!user) return null;

//   return (
//     <div className="p-4 bg-white rounded-lg shadow">
//       <h2 className="text-xl font-bold mb-2">User Profile</h2>
//       <div className="space-y-2">
//         <p><span className="font-medium">Name:</span> {user.name}</p>
//         <p><span className="font-medium">Email:</span> {user.email}</p>
//         <p><span className="font-medium">Role:</span> {user.role}</p>
//         <p><span className="font-medium">Username:</span> {user.username}</p>
//       </div>
//     </div>
//   );
// };