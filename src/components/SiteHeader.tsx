export default function SiteHeader() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">说人话，选笔记本</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        你不需要懂参数。说清楚你要拿它干什么，我把这句话翻译成可以验证的条件，
        <span className="text-slate-700">并且把翻译过程摊开给你看</span>
        ——哪条理解错了，你直接删掉。
      </p>
    </header>
  );
}
