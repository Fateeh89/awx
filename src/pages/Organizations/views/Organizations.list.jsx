import React, {
  Component,
  Fragment
} from 'react';
import {
  withRouter
} from 'react-router-dom';
import { I18n, i18nMark } from '@lingui/react';
import { Trans, t } from '@lingui/macro';
import {
  PageSection,
  PageSectionVariants,
  Title,
} from '@patternfly/react-core';

import DataListToolbar from '../../../components/DataListToolbar';
import OrganizationListItem from '../components/OrganizationListItem';
import Pagination from '../../../components/Pagination';

import api from '../../../api';
import { API_ORGANIZATIONS } from '../../../endpoints';

import {
  encodeQueryString,
  parseQueryString,
} from '../../../qs';

class Organizations extends Component {
  columns = [
    { name: i18nMark('Name'), key: 'name', isSortable: true },
    { name: i18nMark('Modified'), key: 'modified', isSortable: true, isNumeric: true },
    { name: i18nMark('Created'), key: 'created', isSortable: true, isNumeric: true },
  ];

  defaultParams = {
    page: 1,
    page_size: 5,
    order_by: 'name',
  };

  pageSizeOptions = [5, 10, 25, 50];

  constructor (props) {
    super(props);

    const { page, page_size } = this.getQueryParams();

    this.state = {
      page,
      page_size,
      sortedColumnKey: 'name',
      sortOrder: 'ascending',
      count: null,
      error: null,
      loading: true,
      results: [],
      selected: [],
    };
  }

  componentDidMount () {
    const queryParams = this.getQueryParams();
    this.fetchOrganizations(queryParams);
  }

  onSearch () {
    const { sortedColumnKey, sortOrder } = this.state;

    this.onSort(sortedColumnKey, sortOrder);
  }

  getQueryParams (overrides = {}) {
    const { location } = this.props;
    const { search } = location;

    const searchParams = parseQueryString(search.substring(1));

    return Object.assign({}, this.defaultParams, searchParams, overrides);
  }

  onSort = (sortedColumnKey, sortOrder) => {
    const { page_size } = this.state;

    let order_by = sortedColumnKey;

    if (sortOrder === 'descending') {
      order_by = `-${order_by}`;
    }

    const queryParams = this.getQueryParams({ order_by, page_size });

    this.fetchOrganizations(queryParams);
  };

  onSetPage = (pageNumber, pageSize) => {
    const page = parseInt(pageNumber, 10);
    const page_size = parseInt(pageSize, 10);

    const queryParams = this.getQueryParams({ page, page_size });

    this.fetchOrganizations(queryParams);
  };

  onSelectAll = isSelected => {
    const { results } = this.state;

    const selected = isSelected ? results.map(o => o.id) : [];

    this.setState({ selected });
  };

  onSelect = id => {
    const { selected } = this.state;

    const isSelected = selected.includes(id);

    if (isSelected) {
      this.setState({ selected: selected.filter(s => s !== id) });
    } else {
      this.setState({ selected: selected.concat(id) });
    }
  };

  updateUrl (queryParams) {
    const { history, location } = this.props;
    const pathname = '/organizations';
    const search = `?${encodeQueryString(queryParams)}`;

    if (search !== location.search) {
      history.replace({ pathname, search });
    }
  }

  async fetchOrganizations (queryParams) {
    const { page, page_size, order_by } = queryParams;

    let sortOrder = 'ascending';
    let sortedColumnKey = order_by;

    if (order_by.startsWith('-')) {
      sortOrder = 'descending';
      sortedColumnKey = order_by.substring(1);
    }

    this.setState({ error: false, loading: true });

    try {
      const { data } = await api.get(API_ORGANIZATIONS, queryParams);
      const { count, results } = data;

      const pageCount = Math.ceil(count / page_size);

      this.setState({
        count,
        page,
        pageCount,
        page_size,
        sortOrder,
        sortedColumnKey,
        results,
        selected: [],
      });
      this.updateUrl(queryParams);
    } catch (err) {
      this.setState({ error: true });
    } finally {
      this.setState({ loading: false });
    }
  }

  render () {
    const {
      light,
      medium,
    } = PageSectionVariants;
    const {
      count,
      error,
      loading,
      page,
      pageCount,
      page_size,
      sortedColumnKey,
      sortOrder,
      results,
      selected,
    } = this.state;
    const { match } = this.props;
    const parentBreadcrumb = { name: i18nMark('Organizations'), url: match.url };

    return (
      <Fragment>
        <PageSection variant={light} className="pf-m-condensed">
          <Title size="2xl">
            <Trans>Organizations</Trans>
          </Title>
        </PageSection>
        <PageSection variant={medium}>
          <DataListToolbar
            addUrl={`${match.url}/add`}
            isAllSelected={selected.length === results.length}
            sortedColumnKey={sortedColumnKey}
            sortOrder={sortOrder}
            columns={this.columns}
            onSearch={this.onSearch}
            onSort={this.onSort}
            onSelectAll={this.onSelectAll}
            hideExpandCollapse
          />
          <I18n>
            {({ i18n }) => (
              <ul className="pf-c-data-list" aria-label={i18n._(t`Organizations List`)}>
                { results.map(o => (
                  <OrganizationListItem
                    key={o.id}
                    itemId={o.id}
                    name={o.name}
                    detailUrl={`${match.url}/${o.id}`}
                    parentBreadcrumb={parentBreadcrumb}
                    userCount={o.summary_fields.related_field_counts.users}
                    teamCount={o.summary_fields.related_field_counts.teams}
                    adminCount={o.summary_fields.related_field_counts.admins}
                    isSelected={selected.includes(o.id)}
                    onSelect={() => this.onSelect(o.id)}
                  />
                ))}
              </ul>
            )}
          </I18n>
          <Pagination
            count={count}
            page={page}
            pageCount={pageCount}
            page_size={page_size}
            pageSizeOptions={this.pageSizeOptions}
            onSetPage={this.onSetPage}
          />
          { loading ? <div>loading...</div> : '' }
          { error ? <div>error</div> : '' }
        </PageSection>
      </Fragment>
    );
  }
}

export default withRouter(Organizations);
