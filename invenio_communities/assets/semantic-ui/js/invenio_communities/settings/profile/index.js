/*
 * This file is part of Invenio.
 * Copyright (C) 2016-2021 CERN.
 * Copyright (C) 2021 Northwestern University.
 *
 * Invenio is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */

import React, { Component } from "react";
import ReactDOM from "react-dom";
import { Formik, getIn } from "formik";
import * as Yup from "yup";
import _unset from "lodash/unset";
import _defaultsDeep from "lodash/defaultsDeep";
import _get from "lodash/get";
import _map from "lodash/map";
import _mapValues from "lodash/mapValues";
import _find from "lodash/find";
import _cloneDeep from "lodash/cloneDeep";
import _isNumber from "lodash/isNumber";
import _isBoolean from "lodash/isBoolean";
import _isEmpty from "lodash/isEmpty";
import _isObject from "lodash/isObject";
import _isArray from "lodash/isArray";
import _isNull from "lodash/isNull";
import _pickBy from "lodash/pickBy";
import Dropzone from "react-dropzone";

import { DeleteButton } from "./DeleteButton";
import { RenameCommunityButton } from "./RenameCommunityButton";
import { FundingField } from "react-invenio-deposit";

import {
  Divider,
  Icon,
  Image,
  Grid,
  Button,
  Header,
  Form,
  Message,
  Segment,
} from "semantic-ui-react";
import {
  FieldLabel,
  RemoteSelectField,
  SelectField,
  TextField,
} from "react-invenio-forms";
import { CommunityApi } from "../../api";
import { i18next } from "@translations/invenio_communities/i18next";
import { communityErrorSerializer } from "../../api/serializers";

const COMMUNITY_VALIDATION_SCHEMA = Yup.object({
  metadata: Yup.object({
    title: Yup.string().max(
      250,
      i18next.t("Maximum number of characters is 2000")
    ),
    description: Yup.string().max(
      2000,
      i18next.t("Maximum number of characters is 2000")
    ),
    website: Yup.string().url(i18next.t("Must be a valid URL")),
    type: Yup.object().shape({
      id: Yup.string(),
    }),
    // TODO: Re-enable once properly integrated to be displayed
    // page: Yup.string().max(2000, "Maximum number of characters is 2000"),
    // curation_policy: Yup.string().max(
    //   2000,
    //   "Maximum number of characters is 2000"
    // ),
  }),
});

/**
 * Remove empty fields from community
 * Copied from react-invenio-deposit
 * @method
 * @param {object} obj - potentially empty object
 * @returns {object} community - without empty fields
 */
const removeEmptyValues = (obj) => {
  if (_isArray(obj)) {
    let mappedValues = obj.map((value) => removeEmptyValues(value));
    let filterValues = mappedValues.filter((value) => {
      if (_isBoolean(value) || _isNumber(value)) {
        return value;
      }
      return !_isEmpty(value);
    });
    return filterValues;
  } else if (_isObject(obj)) {
    let mappedValues = _mapValues(obj, (value) => removeEmptyValues(value));
    let pickedValues = _pickBy(mappedValues, (value) => {
      if (_isArray(value) || _isObject(value)) {
        return !_isEmpty(value);
      }
      return !_isNull(value);
    });
    return pickedValues;
  }
  return _isNumber(obj) || _isBoolean(obj) || obj ? obj : null;
};

const LogoUploader = (props) => {
  let dropzoneParams = {
    preventDropOnDocument: true,
    onDropAccepted: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const client = new CommunityApi();
        await client.updateLogo(props.community.id, file);
        window.location.reload();
      } catch (error) {
        props.onError(error);
      }
    },
    onDropRejected: (rejectedFiles) => {
      // TODO: show error message when files are rejected e.g size limit
      console.error(rejectedFiles[0].errors);
    },
    multiple: false,
    noClick: true,
    noDrag: true,
    noKeyboard: true,
    disabled: false,
    maxFiles: 1,
    maxSize: 5000000, // 5Mb limit
    accept: ".jpeg,.jpg,.png",
  };

  let deleteLogo = async () => {
    const client = new CommunityApi();
    await client.deleteLogo(props.community.id);
  };

  return (
    <Dropzone {...dropzoneParams}>
      {({ getRootProps, getInputProps, open: openFileDialog }) => (
        <>
          <span {...getRootProps()}>
            <input {...getInputProps()} />
            <Header className="mt-0">{i18next.t("Profile picture")}</Header>
            {props.logo ? (
              <Image src={props.logo.links.self} fluid wrapped rounded />
            ) : (
              <Image src={props.defaultLogo} fluid wrapped rounded />
            )}
            <Divider hidden />
          </span>

          <Button
            fluid
            icon
            labelPosition="left"
            type="button"
            onClick={openFileDialog}
            className="rel-mt-1 rel-mb-1"
          >
            <Icon name="upload" />
            {i18next.t("Upload new picture")}
          </Button>

          {props.logo && (
            <DeleteButton
              label={i18next.t("Delete picture")}
              redirectURL={`${props.community.links.self_html}/settings`}
              confirmationMessage={
                <Header as="h2" size="medium" textAlign="center">
                  {i18next.t("Are you sure you want to delete this picture?")}
                </Header>
              }
              onDelete={deleteLogo}
              onError={props.onError}
            />
          )}
        </>
      )}
    </Dropzone>
  );
};

const DangerZone = ({ community, onError }) => (
  <Segment color="red" className="rel-mt-2">
    <Header as="h2" color="red">
      {i18next.t("Danger zone")}
    </Header>
    <Grid>
      <Grid.Column mobile={16} tablet={10} computer={12}>
        <Header as="h3" size="small">{i18next.t("Rename community")}</Header>
        <p>
          {i18next.t(
            "Renaming your community can have unintended side effects."
          )}
        </p>
      </Grid.Column>
      <Grid.Column mobile={16} tablet={6} computer={4} floated="right">
        <RenameCommunityButton community={community} />
      </Grid.Column>
      <Grid.Column mobile={16} tablet={10} computer={12} floated="left">
        <Header as="h3" size="small">{i18next.t("Delete community")}</Header>
        <p>
          {i18next.t(
            "Once deleted, it will be gone forever. Please be certain."
          )}
        </p>
      </Grid.Column>
      <Grid.Column mobile={16} tablet={6} computer={4} floated="right">
        <DeleteButton
          community={community}
          label={i18next.t("Delete community")}
          redirectURL="/communities"
          confirmationMessage={
            <h3>
              {i18next.t("Are you sure you want to delete this community?")}
            </h3>
          }
          onDelete={async () => {
            const client = new CommunityApi();
            await client.delete(community.id);
          }}
          onError={onError}
        />
      </Grid.Column>
    </Grid>
  </Segment>
);

class CommunityProfileForm extends Component {
  state = {
    error: "",
  };

  /**
   * Object stores known organizations, so that an organization's name can be mapped to it's ID (if known).
   */
  knownOrganizations = {};

  getInitialValues = () => {
    let initialValues = _defaultsDeep(this.props.community, {
      id: "",
      metadata: {
        description: "",
        title: "",
        // TODO: Re-enable once properly integrated to be displayed
        // curation_policy: "",
        // page: "",
        type: {},
        website: "",
        organizations: [],
        funding: []
      },
      // TODO: should this come from the backend?
      access: {
        visibility: "public",
        member_policy: "open",
        record_policy: "open",
      },
    });

    // Deserialise organisations. Store known communities.
    const organizations = [];
    initialValues.metadata.organizations.map((org) => {
      if (org.id) {
        this.knownOrganizations[org.name] = org.id;
      }
      organizations.push(org.name);
    })

    _unset(initialValues, "metadata.type.title");
    /**
     * Deserializes a funding record (e.g. funder or award)
     *
     * @param {object} fund
     *
     * @returns {object} an object containing the deserialized record
     */
     const deserializeFunding = ((fund) => {
      const _deserialize = ((value) => {
        const deserializedValue = _cloneDeep(value);

        if (value?.title?.en) {
          deserializedValue.title = value.title.en;
        }

        if (value.identifiers) {
          const allowedIdentifiers = ['url'];

          allowedIdentifiers.forEach((identifier) => {
            let identifierValue = null;
            value.identifiers.forEach((v) => {
              if (v.scheme === identifier) {
                identifierValue = v.identifier;
              }
            });

            if (identifierValue) {
              deserializedValue[identifier] = identifierValue;
            }
          })

          delete deserializedValue['identifiers'];
        }
        return deserializedValue;
      });

      let deserializedValue = {};
      if (fund !== null) {
        deserializedValue = Array.isArray(fund)
          ? fund.map(_deserialize)
          : _deserialize(fund);
      }

      return deserializedValue;
    });

    // Deerialize each funding record, award being optional.
    const funding = initialValues.metadata.funding.map((fund) => {
      return {
        ...(fund.award && {award: deserializeFunding(fund.award)}),
        funder: deserializeFunding(fund.funder)
      }
    });

    return {
      ...initialValues,
      metadata: { ...initialValues.metadata, organizations, funding },
    };
  };

  /**
   * Serializes community values
   *
   * @param {object} values
   *
   * @returns
   */
  serializeValues = (values) => {
    /**
     * Serializes a funding record (e.g. funder or award)
     *
     * @param {object} fund
     *
     * @returns {object} an object containing the serialized record
     */
     const serializeFunding = ((fund) => {
      const _serialize = (value) => {
        if (value.id) {
          return { id: value.id };
        }

        // Record is a custom record, without explicit 'id'
        const clonedValue = _cloneDeep(value);
        if (value.title) {
          clonedValue.title = {
            "en": value.title
          };
        }

        if (value.url) {
          clonedValue.identifiers = [
            {
              "identifier": value.url,
              "scheme": "url"
            }
          ]
          delete clonedValue["url"];
        }

        return clonedValue;
      }

      let serializedValue = {};
      if (fund !== null) {
        serializedValue = Array.isArray(fund)
          ? fund.map(_serialize)
          : _serialize(fund);
      }

      return serializedValue;
     });

    let submittedCommunity = _cloneDeep(values);

    // Serialize organisations. If it is known and has an id, serialize a pair 'id/name'. Otherwise use 'name' only
    const organizations = submittedCommunity.metadata.organizations.map(
      (organization) => {
        const orgID = this.knownOrganizations[organization];
        return {
          ...(orgID && {id: orgID}),
          name: organization
        };
      }
    );

    // Serialize each funding record, award being optional.
    const funding = submittedCommunity.metadata?.funding.map(
      (fund) => {
        return {
          ...(fund.award && {award: serializeFunding(fund.award)}),
          funder: serializeFunding(fund.funder)
        }
      }
    );

    submittedCommunity = {
      ...submittedCommunity,
      metadata: { ...values.metadata, organizations, funding },
    };

    // Clean values
    submittedCommunity = removeEmptyValues(submittedCommunity);

    return submittedCommunity;
  };

  setGlobalError = (error) => {
    const { message } = communityErrorSerializer(error);
    this.setState({ error: message });
  };

  onSubmit = async (values, { setSubmitting, setFieldError }) => {
    setSubmitting(true);
    const payload = this.serializeValues(values);
    const client = new CommunityApi();

    try {
      await client.update(this.props.community.id, payload);
      window.location.reload();
    } catch (error) {
      if (error === "UNMOUNTED") return;

      const { message, errors } = communityErrorSerializer(error);

      setSubmitting(false);

      if (message) {
        this.setGlobalError(error);
      }
      if (errors) {
        errors.map(({ field, messages }) => setFieldError(field, messages[0]));
      }
    }
  };

  render() {
    return (
      <Formik
        initialValues={this.getInitialValues(this.props.community)}
        validationSchema={COMMUNITY_VALIDATION_SCHEMA}
        onSubmit={this.onSubmit}
      >
        {({ isSubmitting, isValid, handleSubmit }) => (
          <Form onSubmit={handleSubmit} className="communities-profile">
            <Message
              hidden={this.state.error === ""}
              negative
              className="flashed top attached"
            >
              <Grid container>
                <Grid.Column width={15} textAlign="left">
                  <strong>{this.state.error}</strong>
                </Grid.Column>
              </Grid>
            </Message>
            <Grid>
              <Grid.Row>
                <Grid.Column width={16}>
                  <Header as="h2">{community.id}</Header>
                  <Divider />
                </Grid.Column>
              </Grid.Row>

              <Grid.Row className="pt-0 pb-0">
                <Grid.Column mobile={16} tablet={9} computer={9} className="rel-pb-2">
                  <TextField
                    fluid
                    fieldPath="metadata.title"
                    label={
                      <FieldLabel
                        htmlFor="metadata.title"
                        icon={"book"}
                        label={i18next.t("Community name")}
                      />
                    }
                  />
                  <SelectField
                    search
                    clearable
                    fieldPath="metadata.type.id"
                    label={
                      <FieldLabel
                        htmlFor="metadata.type.id"
                        icon="tag"
                        label={i18next.t("Type")}
                      />
                    }
                    options={this.props.commTypes.map((ct) => {
                      return {
                        value: ct.id,
                        text: ct?.title?.en ?? ct.id
                      }
                    })}
                  />
                  <TextField
                    fieldPath="metadata.website"
                    label={
                      <FieldLabel
                        htmlFor="metadata.website"
                        icon="chain"
                        label={i18next.t("Website")}
                      />
                    }
                    fluid
                  />
                  <TextField
                    fieldPath="metadata.description"
                    label={
                      <FieldLabel
                        htmlFor="metadata.description"
                        icon={"pencil"}
                        label={i18next.t("Description")}
                      />
                    }
                    optimized
                  />
                  <RemoteSelectField
                    fieldPath={"metadata.organizations"}
                    suggestionAPIUrl="/api/affiliations"
                    suggestionAPIHeaders={{
                      Accept: "application/json",
                    }}
                    placeholder={i18next.t(
                      "Search for an organization by name"
                    )}
                    clearable
                    multiple
                    initialSuggestions={_get(
                      this.props.community,
                      "metadata.organizations",
                      []
                    )}
                    serializeSuggestions={(organizations) =>
                      _map(organizations, (organization) =>
                      {
                        const isKnownOrg = this.knownOrganizations.hasOwnProperty(organization.name);
                        if (!isKnownOrg) {
                          this.knownOrganizations = {
                            ...this.knownOrganizations,
                            [organization.name]: organization.id
                          };
                        }
                        return {
                          text: organization.name,
                          value: organization.name,
                          key: organization.name
                        }
                      })
                    }
                    label={i18next.t("Organizations")}
                    noQueryMessage={i18next.t("Search for organizations...")}
                    allowAdditions
                    search={(filteredOptions, searchQuery) => filteredOptions}
                  />
                  <FundingField
                    fieldPath="metadata.funding"
                    searchConfig={{
                      searchApi: {
                        axios: {
                          headers: {
                            //  FIXME use for internationalisation
                            //  Accept: "application/vnd.inveniordm.v1+json"
                            Accept: "application/json",
                          },
                          url: "/api/awards",
                          withCredentials: false,
                        },
                      },
                      initialQueryState: {
                        sortBy: "bestmatch",
                        sortOrder: "asc",
                        layout: "list",
                        page: 1,
                        size: 5,
                      },
                    }}
                    label="Awards"
                    labelIcon="money bill alternate outline"
                    deserializeAward={(award) => {
                      return {
                        title: award.title.en ?? award.title,
                        pid: award.pid,
                        number: award.number,
                        funder: award.funder ?? '',
                        id: award.id,
                        ...(award.identifiers && { identifiers: award.identifiers }),
                        ...(award.acronym && { acronym: award.acronym })
                      }
                    }}
                    deserializeFunder={(funder) => {
                      return {
                        id: funder.id,
                        name: funder.name,
                        ...(funder.pid && { pid: funder.pid }),
                        ...(funder.country && { country: funder.country }),
                        ...(funder.identifiers && { identifiers: funder.identifiers })
                      }
                    }
                    }
                    computeFundingContents={(funding) => {
                      let headerContent, descriptionContent = '';
                      let awardOrFunder = 'award';
                      if (funding.award) {
                        headerContent = funding.award.title;
                      }

                      if (funding.funder) {
                        const funderName = funding.funder?.name ?? funding.funder?.title?.en ?? funding.funder?.id ?? '';
                        descriptionContent = funderName;
                        if (!headerContent) {
                          awardOrFunder = 'funder';
                          headerContent = funderName;
                          descriptionContent = '';
                        }
                      }

                      return { headerContent, descriptionContent, awardOrFunder };
                    }}
                  />
                  {/* TODO: Re-enable once properly integrated to be displayed */}
                  {/* <RichInputField
                    label="Curation policy"
                    fieldPath="metadata.curation_policy"
                    label={
                      <FieldLabel
                        htmlFor="metadata.curation_policy"
                        icon={"pencil"}
                        label="Curation policy"
                      />
                    }
                    editorConfig={CKEditorConfig}
                    fluid
                  />
                  <RichInputField
                    fieldPath="metadata.page"
                    label={
                      <FieldLabel
                        htmlFor="metadata.page"
                        icon={"pencil"}
                        label="Page description"
                      />
                    }
                    editorConfig={CKEditorConfig}
                    fluid
                  /> */}
                  <Button
                    disabled={!isValid || isSubmitting}
                    loading={isSubmitting}
                    labelPosition="left"
                    primary
                    type="submit"
                    icon
                  >
                    <Icon name="save" />
                    {i18next.t("Save")}
                  </Button>
                </Grid.Column>
                <Grid.Column mobile={16} tablet={6} computer={4} floated="right">
                  <LogoUploader
                    community={this.props.community}
                    logo={this.props.logo}
                    defaultLogo={this.props.defaultLogo}
                    onError={this.setGlobalError}
                  />
                </Grid.Column>
              </Grid.Row>
              <Grid.Row className="danger-zone">
                <Grid.Column width={16}>
                  <DangerZone
                    community={this.props.community}
                    onError={this.setGlobalError}
                  />
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </Form>
        )}
      </Formik>
    );
  }
}

const domContainer = document.getElementById("app");
const community = JSON.parse(domContainer.dataset.community);
const logo = JSON.parse(domContainer.dataset.logo);
const commTypes = JSON.parse(domContainer.dataset.comtypes);

ReactDOM.render(
  <CommunityProfileForm
    community={community}
    logo={logo}
    defaultLogo="/static/images/square-placeholder.png"
    commTypes={commTypes}
  />,
  domContainer
);
export default CommunityProfileForm;
