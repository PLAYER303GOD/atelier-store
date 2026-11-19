import { services } from "@/lib/site";

export function Services() {
  return (
    <section aria-labelledby="services-title" className="container-page py-section">
      <h2 id="services-title" className="sr-only">
        Our services
      </h2>
      <ul role="list" className="reveal grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <li key={service.title} className="bg-paper py-6 sm:p-8">
            <h3 className="text-label font-medium uppercase">{service.title}</h3>
            <p className="mt-2 max-w-xs text-body-sm text-muted">{service.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
