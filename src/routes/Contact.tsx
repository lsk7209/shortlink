import { usePageMeta } from '../lib/seo'

const Contact = () => {
  usePageMeta({
    title: '문의 | shorty.link',
    description: '단축 링크 서비스 문의처 안내',
    canonical: `${(import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin}/contact`,
  })

  return (
    <div className="max-w-3xl space-y-4 text-slate-700">
      <h1>문의</h1>
      <p>서비스 사용 중 문의가 있다면 이메일로 연락 주세요.</p>
      <ul>
        <li>이메일: support@shorty.link</li>
        <li>응답: 영업일 기준 24시간 이내</li>
      </ul>
    </div>
  )
}

export default Contact

