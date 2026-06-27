function PageHero({ eyebrow, title, description, action }) {
  return (
    <section className="ui-page-hero">
      <div>
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>

      {action && (
        <div className="ui-page-hero-action">
          {action}
        </div>
      )}
    </section>
  );
}

export default PageHero;
