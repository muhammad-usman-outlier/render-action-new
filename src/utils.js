const urlRegex =
  /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g

export function getComment({
  comments,
  pattern
}) {
  return comments?.find(
    ({
      body
    }) =>
      body?.includes(pattern)
  )
}

export function getUrlFromComment(
  comment,
  params
) {
  const elementIndex = (params.index || 1) - 1
  return comment?.body?.match(urlRegex)?.[elementIndex]
}
