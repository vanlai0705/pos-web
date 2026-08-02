import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from './ui/breadcrumb';
import { Slash } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

type BreadcrumbItemProps = {
  title: string;
  link: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItemProps[] }) {
  const { t } = useTranslation();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.title}>
            {index !== items.length - 1 && (
              <BreadcrumbItem>
                <BreadcrumbLink href={item.link}>
                  {t(`navigation.${item.title}`)}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {index < items.length - 1 && (
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
            )}
            {index === items.length - 1 && (
              <BreadcrumbPage> {t(`navigation.${item.title}`)}</BreadcrumbPage>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
