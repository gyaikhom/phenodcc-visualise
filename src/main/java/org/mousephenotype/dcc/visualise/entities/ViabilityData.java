/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import java.util.Iterator;
import java.util.List;
import javax.xml.bind.annotation.XmlElement;

/**
 * The structure of viability data that is returned by the ViabilityFacadeREST
 * web service.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
public class ViabilityData {

    private String outcome;
    private Double pValue;
    private Double percentageHomozygous;

    public class GroupData {

        private Integer total;
        private Integer wt;
        private Integer het;
        private Integer hom;

        public GroupData() {
        }

        public Integer getTotal() {
            return total;
        }

        public void setTotal(Integer total) {
            this.total = total;
        }

        @XmlElement(name = "WT")
        public Integer getWt() {
            return wt;
        }

        public void setWt(Integer wt) {
            this.wt = wt;
        }

        @XmlElement(name = "Het")
        public Integer getHet() {
            return het;
        }

        public void setHet(Integer het) {
            this.het = het;
        }

        @XmlElement(name = "Hom")
        public Integer getHom() {
            return hom;
        }

        public void setHom(Integer hom) {
            this.hom = hom;
        }
    };

    private class GroupContainer {
        private GroupData combined;
        private GroupData male;
        private GroupData female;

        public GroupContainer() {
            combined = new GroupData();
            male = new GroupData();
            female = new GroupData();
        }

        @XmlElement(name = "Male and female")
        public GroupData getCombined() {
            return combined;
        }

        public void setCombined(GroupData combined) {
            this.combined = combined;
        }

        @XmlElement(name = "Male")
        public GroupData getMale() {
            return male;
        }

        public void setMale(GroupData male) {
            this.male = male;
        }

        @XmlElement(name = "Female")
        public GroupData getFemale() {
            return female;
        }

        public void setFemale(GroupData female) {
            this.female = female;
        }
    };
    private GroupContainer groups;

    public ViabilityData(List<KeyValueRecord> recs) {
        groups = new GroupContainer();
        Iterator<KeyValueRecord> i = recs.iterator();
        while (i.hasNext()) {
            KeyValueRecord kvr = i.next();

            /**
             * NOTE: This requires that every time IMPReSS is updated, these
             * values should be set correctly.
             *
             * This is not pretty, but this is the only way we can group and
             * organise the measurements together.
             */
            switch (kvr.getKey()) {
                case 3794: /* IMPC_VIA_001_001: outcome */
                    outcome = kvr.getValue();
                    break;
                case 3826: /* IMPC_VIA_032_001: p-value for outcome call */
                    pValue = Double.parseDouble(kvr.getValue());
                    break;
                case 3812: /* IMPC_VIA_019_001: % pups homozygous */
                    percentageHomozygous = Double.parseDouble(kvr.getValue());
                    break;
                case 3796: /* IMPC_VIA_003_001: total pups */
                    groups.combined.total = Integer.parseInt(kvr.getValue());
                    break;
                case 3797: /* IMPC_VIA_004_001: total pups WT */
                    groups.combined.wt = Integer.parseInt(kvr.getValue());
                    break;
                case 3798: /* IMPC_VIA_005_001: total pups heterozygous */
                    groups.combined.het = Integer.parseInt(kvr.getValue());
                    break;
                case 3799: /* IMPC_VIA_006_001: total pups homozygous */
                    groups.combined.hom = Integer.parseInt(kvr.getValue());
                    break;
                case 3803: /* IMPC_VIA_010_001: total male pups */
                    groups.male.total = Integer.parseInt(kvr.getValue());
                    break;
                case 3800: /* IMPC_VIA_007_001: total male WT */
                    groups.male.wt = Integer.parseInt(kvr.getValue());
                    break;
                case 3801: /* IMPC_VIA_008_001: total male heterozygous */
                    groups.male.het = Integer.parseInt(kvr.getValue());
                    break;
                case 3802: /* IMPC_VIA_009_001: total male homozygous */
                    groups.male.hom = Integer.parseInt(kvr.getValue());
                    break;
                case 3807: /* IMPC_VIA_014_001: total female pups */
                    groups.female.total = Integer.parseInt(kvr.getValue());
                    break;
                case 3804: /* IMPC_VIA_011_001: total female WT */
                    groups.female.wt = Integer.parseInt(kvr.getValue());
                    break;
                case 3805: /* IMPC_VIA_012_001: total female heterozygous */
                    groups.female.het = Integer.parseInt(kvr.getValue());
                    break;
                case 3806: /* IMPC_VIA_013_001: total female homozygous */
                    groups.female.hom = Integer.parseInt(kvr.getValue());
                    break;
            }
        }
    }

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }

    public Double getpValue() {
        return pValue;
    }

    public void setpValue(Double pValue) {
        this.pValue = pValue;
    }

    public Double getPercentageHomozygous() {
        return percentageHomozygous;
    }

    public void setPercentageHomozygous(Double percentageHomozygous) {
        this.percentageHomozygous = percentageHomozygous;
    }

    public GroupContainer getGroups() {
        return groups;
    }

    public void setGroups(GroupContainer groups) {
        this.groups = groups;
    }
    
}
