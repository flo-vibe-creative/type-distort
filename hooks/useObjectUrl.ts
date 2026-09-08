'use client'

import { useEffect, useState } from 'react'

/**
 * 파일을 화면에서 참조할 수 있는 임시 주소로 바꾼다.
 * 파일이 바뀌거나 화면에서 사라질 때 이전 주소를 정리해 메모리가 새지 않게 한다.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const created = URL.createObjectURL(blob)
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [blob])

  return url
}
