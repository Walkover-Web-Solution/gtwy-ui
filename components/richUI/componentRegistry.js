"use client";
/**
 * componentRegistry.js
 *
 * Maps richUI JSON node `type` strings to their corresponding React components.
 * Import this from RenderNode.js and anywhere else that needs type → component resolution.
 */

import CardComponent from "./components/CardComponent";
import RowComponent from "./components/RowComponent";
import ColComponent from "./components/ColComponent";
import TextComponent from "./components/TextComponent";
import TitleComponent from "./components/TitleComponent";
import ButtonComponent from "./components/ButtonComponent";
import ImageComponent from "./components/ImageComponent";
import DividerComponent from "./components/DividerComponent";
import SpacerComponent from "./components/SpacerComponent";
import BoxComponent from "./components/BoxComponent";
import IconComponent from "./components/IconComponent";
import ListViewComponent from "./components/ListViewComponent";
import ListViewItemComponent from "./components/ListViewItemComponent";
import BadgeComponent from "./components/BadgeComponent";
import DatePickerComponent from "./components/DatePickerComponent";
import SelectComponent from "./components/SelectComponent";
import CaptionComponent from "./components/CaptionComponent";
import TableComponent from "./components/TableComponent";

export const componentRegistry = {
  Card: CardComponent,
  Row: RowComponent,
  Col: ColComponent,
  Text: TextComponent,
  Title: TitleComponent,
  Button: ButtonComponent,
  Image: ImageComponent,
  Divider: DividerComponent,
  Spacer: SpacerComponent,
  Box: BoxComponent,
  Icon: IconComponent,
  ListView: ListViewComponent,
  ListViewItem: ListViewItemComponent,
  Badge: BadgeComponent,
  DatePicker: DatePickerComponent,
  DateRangePicker: (props) => <DatePickerComponent {...props} range={true} />,
  Select: SelectComponent,
  Caption: CaptionComponent,
  Table: TableComponent,
};
