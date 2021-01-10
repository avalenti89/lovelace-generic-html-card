import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  PropertyValues,
  internalProperty,
} from "lit-element";
import {
  HomeAssistant,
  LovelaceCardConfig,
  LovelaceCard,
  // hasConfigOrEntityChanged,
} from "custom-card-helpers";
import { createCard } from "card-tools/src/lovelace-element";

export interface GenericHtmlCardConfig extends LovelaceCardConfig {
  id?: string;
  className?: string;
  styles?: string[];
  jss?: string[];
}

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "generic-html-card",
  name: "Generic HTML Card",
  description: "Generic HTLM Card",
});

@customElement("generic-html-card")
export class GenericHtmlCard extends LitElement {
  public static getStubConfig(): Record<string, unknown> {
    return { cards: [] };
  }

  // https://lit-element.polymer-project.org/guide/properties
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property() protected _cards?: LovelaceCard[];
  @internalProperty() private config!: GenericHtmlCardConfig;

  // https://lit-element.polymer-project.org/guide/properties#accessors-custom
  public setConfig(config: GenericHtmlCardConfig): void {
    // console.log("setConfig", this.config, config);
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (
      (config.styles && !Array.isArray(config.styles)) ||
      (config.jss && !Array.isArray(config.jss))
    ) {
      throw new Error("Invalid styles or jss");
    }

    this.config = {
      name: "Generic html",
      ...config,
    };

    this._cards =
      config.cards?.map((card) => {
        const element = this._createCardElement(card);
        return element;
      }) ?? [];
  }

  protected updated(changedProps: PropertyValues) {
    // console.log("updated", this.config);

    super.updated(changedProps);
    if (!this._cards || !changedProps.has("hass")) {
      return;
    }

    for (const element of this._cards) {
      if (this.hass) {
        element.hass = this.hass;
      }
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // console.log("shouldUpdate", this.config, changedProps);
    if (!this.config) {
      return false;
    }
    return this.hass !== changedProps.get("hass");

    // TODO it should update when one of the cards updates
    // const hasToChange = hasConfigOrEntityChanged(this, changedProps, false);
    // console.log("shoudlUpdate", hasToChange);
    // return hasToChange;
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    // console.log("_createCardElement", this.config, cardConfig);
    // const element = createCardElement(cardConfig) as LovelaceCard;
    const element = createCard(cardConfig) as LovelaceCard;

    // console.log(this.config?.id, this.config, cardConfig);
    if (this.hass) {
      element.hass = this.hass;
    }
    if (cardConfig.type === "custom:generic-html-card") {
      if (cardConfig.className) {
        element.className = cardConfig.className;
      }
      if (cardConfig.id) {
        element.id = cardConfig.id;
      }
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(element, cardConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildCard(
    cardElToReplace: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    // console.log("_rebuildCard", this.config, config);
    const newCardEl = this._createCardElement(config);
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement.replaceChild(newCardEl, cardElToReplace);
    }
    this._cards = this._cards!.map((curCardEl) =>
      curCardEl === cardElToReplace ? newCardEl : curCardEl
    );
  }

  // https://lit-element.polymer-project.org/guide/templates
  protected render(): TemplateResult | void {
    // console.log("render", this.config);
    const styles =
      this.config.styles?.reduce((prev, style) => {
        if (
          typeof style !== "string" ||
          /^(http(s)?:\/\/)?(w{3}.)?.*\.css\??.*$/.test(style)
        ) {
          return prev;
        }
        return `${prev}${style}\n\n`;
      }, "") ?? "";

    let html_style: TemplateResult | undefined;
    if (styles) {
      html_style = html`<style>
        ${styles}
      </style>`;
    }

    const style_resources = this.config.styles?.reduce<TemplateResult[]>(
      (prev, style) => {
        if (
          typeof style !== "string" ||
          !/^(http(s)?:\/\/)?(w{3}.)?.*\.css\??.*$/.test(style)
        ) {
          return prev;
        }

        return [
          ...prev,
          html`<link type="text/css" rel="stylesheet" href="${style}" />`,
        ];
      },
      []
    );

    return html`
      ${html_style} ${style_resources}
      ${this.config.jss?.map((js) => html`<script src="${js}"></script>`)}
      ${this._cards}
    `;
  }
  createRenderRoot() {
    return this;
  }
}
