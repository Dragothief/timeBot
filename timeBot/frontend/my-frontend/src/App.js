import React, { useEffect, useState } from 'react';
let temp = {};
const VoiceChannelTracker = () => {
  const [users, setUsers] = useState({});

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === 'userJoined') {
        setUsers((prevUsers) => ({
          ...prevUsers,
          [message.userId]: {
            username: message.username,
            startTime: message.timestamp,
            userId: message.userId,
            afkTime: false,
            afkstartTime: null,
            afkTotalTime: 0,
          },
        }));
      } else if (message.event === 'userLeft') {
        setUsers((prevUsers) => {
          const newUsers = { ...prevUsers };
          delete newUsers[message.userId];
          return newUsers;
        });
      } else if (message.event === 'joinedAfk') {
        setUsers((prevUsers) => ({
          ...prevUsers,
          [message.userId]: {
            ...prevUsers[message.userId],
            afkTime: true,
            afkstartTime: new Date(), // Set the time when they went AFK
          },
        }));
      } else if (message.event === 'leftAfk') {
        setUsers((prevUsers) => {
          const user = prevUsers[message.userId];
          const now = new Date();
          const afkDuration = now - new Date(user.afkstartTime);
          return {
            ...prevUsers,
            [message.userId]: {
              ...user,
              afkTime: false,
              afkTotalTime: user.afkTotalTime + afkDuration, // Accumulate total AFK time
              afkstartTime: null,
            },
          };
        });
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    return () => {
      ws.close();
    };
  }, []);

  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const updateTimes = () => {
      const fullArray = Object.entries(users);

      fullArray.forEach(([userId, user]) => {
        const now = new Date();
        const startTime = new Date(user.startTime);
        let diff = now - startTime - user.afkTotalTime;

        if (user.afkTime) {
          // If the user is AFK, we don't update their active time
          return;
        }

        const time = timeDiff(diff);
        temp[userId] = time;
      });

      // Set the time after updating all users
      const allTimes = Object.values(temp);
      if (allTimes.length > 0) {
        setTime(allTimes.join(", "));
      }
    };

    const timeDiff = (diff) => {
      const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };

    updateTimes(); // Initial call to set the time immediately

    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [users]);

  return (
    <div>
      <h1>Users in Voice Channel</h1>
      <ul>
        {Object.entries(users).map(([userId, user]) => (
          <li key={userId}>
            {user.username} - {temp[userId]}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VoiceChannelTracker;
