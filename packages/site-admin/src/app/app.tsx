import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './app.module.css';

import Table from './Table';
import { Content } from '@hwebs/content-client';

const posts: Content[] = [
  {
    id: 1,
    title: 'Death Ray',
    link: 'https://deathrayop.bandcamp.com/album/urbane-living',
  },
];

export function App() {
  //useEffect(() => {}, []);
  //  const [Posts, setPosts] = useState([]);

  return (
    <>
      <h1>Admin Site</h1>
      <Table posts={posts} />
    </>
  );
}

export default App;
