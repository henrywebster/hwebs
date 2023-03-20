import React from 'react';
import Table from 'react-bootstrap/Table';
import { Content } from '@hwebs/content-client';

interface Props {
  posts: Content[];
}

export default ({ posts }: Props): JSX.Element => (
  <Table striped bordered>
    <thead>
      <tr>
        <th>Id</th>
        <th>Title</th>
        <th>Link</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      {posts.map((post, key) => (
        <tr>
          <td>{post.id}</td>
          <td>{post.title}</td>
          <td>{post.link}</td>
          <td>{post.category}</td>
        </tr>
      ))}
    </tbody>
  </Table>
);
