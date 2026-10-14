export default function LoginExample() {
  return <section className="login-example" aria-label="Illustrative study example">
    <div className="login-example-cards">
      <article className="login-note">
        <div className="login-note-labels">
          <span className="login-biology">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 3C9 2 3 7 4 14c1 6 8 7 12 2 3-4 4-9 4-13Z" />
              <path d="M3 21 16 8" />
            </svg>
            BIOLOGY
          </span>
          <span>SOURCE NOTE</span>
        </div>
        <p>Plants use <mark>light energy</mark> to make glucose.</p>
      </article>
      <svg className="login-example-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12h16m-7-7 7 7-7 7" />
      </svg>
      <article className="login-question">
        <p className="login-question-label">PRACTICE QUESTION</p>
        <h2>What do plants use to make glucose?</h2>
        <ul className="login-example-options" aria-label="Example answers, with Light energy selected">
          {['Light energy', 'Sound', 'Heat'].map((answer, index) => <li key={answer} className={index === 0 ? 'login-example-selected' : undefined}>
            <span className="login-example-radio" aria-hidden="true" />
            {answer}
          </li>)}
        </ul>
      </article>
    </div>
  </section>;
}
