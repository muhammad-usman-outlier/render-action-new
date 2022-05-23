import gql from 'graphql-tag';

export const DeployDocument = gql`
    query Deploy($id: String!) {
  deploy(id: $id) {
    id
    status
    server {
      id
      url
    }
  }
}
    `;
export const DeploysDocument = gql`
    query Deploys($serverId: String!) {
  deploys(serverId: $serverId) {
    id
    status
    branch
    commitId
    server {
      id
      name
    }
  }
}
    `;
export const PullRequestServersDocument = gql`
    query PullRequestServers($serverId: String!) {
  pullRequestServers(serverId: $serverId) {
    pullRequest {
      number
    }
    server {
      id
    }
  }
}
    `;
export const SignInDocument = gql`
    mutation SignIn($email: String!, $password: String!) {
  signIn(email: $email, password: $password) {
    idToken
  }
}
    `;

const defaultWrapper = (action, _operationName) => action();

export function getSdk(client, withWrapper = defaultWrapper) {
  return {
    Deploy(variables, requestHeaders) {
      return withWrapper((wrappedRequestHeaders) => client.request(DeployDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Deploy');
    },
    Deploys(variables, requestHeaders) {
      return withWrapper((wrappedRequestHeaders) => client.request(DeploysDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Deploys');
    },
    PullRequestServers(variables, requestHeaders) {
      return withWrapper((wrappedRequestHeaders) => client.request(PullRequestServersDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'PullRequestServers');
    },
    SignIn(variables, requestHeaders) {
      return withWrapper((wrappedRequestHeaders) => client.request(SignInDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'SignIn');
    }
  };
}