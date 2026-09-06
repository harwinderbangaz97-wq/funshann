import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/services/firebase.js';

async function listUsers() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(JSON.stringify(users, null, 2));
}

listUsers().catch(console.error);
